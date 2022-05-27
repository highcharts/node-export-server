/*

Highcharts Export Server

Copyright (c) 2016, Highsoft

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/

const log = require('./logger').log;
const phantomjs = require('phantomjs-prebuilt');
const fs = require('fs');

var settings = false,
    workers = [],
    workQueue = [],
    instCount = 0,
    queueOverflow = 0
;

function killAll() {
    workers = workers.filter(function (worker) {
        if (worker.process) {
            worker.process.kill();
        }
        return false;
    });
}

function doTerminate() {
    log(3, 'terminating, killing all running phantom processes');
    killAll();
}

function attachExitListeners() {

    log(4, 'attaching exit listeners to the process..');

    process.on('exit', doTerminate);

    process.on('SIGINT', function (code) {
        process.exit(code);
    });

    process.on('uncaughtException', function (e) {
        console.log('uncaughtException:', e);
        // process.exit(1);
    });
}

////////////////////////////////////////////////////////////////////////////////

function cleaner() {
    var t = (new Date()).getTime(),
        w = workers.filter(function (w) {
            return w.working;
        })
    ;

    log(4, 'reaper checking for timed out phantom processes');

    //We don't want to mutate the workers array while we're iterating
    w.forEach(function (worker) {
        if (t - worker.workStartTime > 2000) {
            worker.doDone('server too busy, please try again later', false, 408);
            worker.restart(true);
        }
    });
}

function spawnWorker(processQueueAfterCreation) {
    var worker = {
        data: false,
        working: false,
        ready: true,
        alive: true,
        process: false,
        workStartTime: 0,
        ondone: false,
        //Stop a bunch of workers restarting at the same time
        workcount: settings.workLimit ? Math.round((settings.workLimit / 2) * Math.random()) : 0,
        incoming: '',
        id: ++instCount
    };

    log(4, 'phantom', worker.id, '- spawning worker');

    if (!settings) return log(1, 'phantom', worker.id, '- tried spawning worker, but pool not inited');

    function nextInLine() {
        //Process the queue
        if (workQueue.length > 0) {
            var item = workQueue[0];
            workQueue.splice(0, 1);
            worker.work(item.data, item.fn);
        }
    }

    function doDone(err, data, status, ptime) {
        if (worker.ondone) {
            worker.ondone(err, data, status, ptime);

            worker.ondone = false;
            worker.working = false;
            worker.ready = true;
        }
    }

    worker.process = phantomjs.exec(settings.worker, (__dirname + '/../'));
    worker.process.stdin.setEncoding('utf-8');
    worker.process.stdout.setEncoding('utf-8');

    worker.process.on('uncaughtException', (err) => {
      log(1, 'phantom worker exception', err);
      doDone('0x01 error when performing chart generation: please check your input data');
      worker.restart(true);
    });

    worker.process.on('error', function (err) {
        log(1, 'phantom worker', worker.id, '-', err);
        log(3, 'phantom - sending complete event with error');

        doDone('0x02 error when performing chart generation: please check your input data:', err);
        worker.restart(true);
    });

    worker.process.on('close', function (code, signal) {
        log(3, 'phantom worker', worker.id, '- process was closed');

        worker.ready = false;
        worker.alive = false;
        worker.working = false;

        doDone('0x03 error when performing chart generation: please check your input data');

        if (signal !== 'SIGTERM') {

        }
    });

    worker.process.stderr.on('data', function (data) {
        log(1, 'phantom worker', worker.id, 'error -', data.toString());
    });

    worker.doDone = doDone;

    worker.restart = function (checkQueue) {

        if (!worker.allowRestart) {
          log(2, 'worker', worker.id, 'is being written to, restart delayed');
          return setTimeout(worker.restart, 10);
        }

        if (worker.process) {
            worker.process.kill('SIGKILL');
        }

        // If there's an ondone callback attached, we restarted in the
        // middle of a request.

        doDone('0x04 error when performing chart generation: please check your input data');

        log(3, 'restarting worker. working =', worker.working);

        worker.ready = false;
        worker.ondone = false;
        worker.working = false;

        workers = workers.filter(function (w) {
            return w.id !== worker.id;
        });

        return spawnWorker(checkQueue);
    };

    worker.process.stdout.on('data', function (data) {
        var wt = ((new Date()).getTime() - worker.workStartTime);

        if (worker.ready || typeof data === 'undefined' || !worker.working) {
            //We're not expecting any data from this worker
            return;
        }

        data = data.toString();

        worker.incoming += data;

        //There's no object nesting, and no } inside valid return so this is safe.
        if (data[data.length - 1] !== '}') {
            return;
        }

        try {
            worker.incoming = JSON.parse(worker.incoming + '\n');
        } catch (e) {
            log(1, 'phantom worker', worker.id, 'unexpected data -', worker.incoming, worker);
            doDone('an error occured when rendering the chart: ' + e.toString(), false, 400);
            nextInLine();
            return;
        }

        log(3,
            'phantom worker',
            worker.id,
            'finished work',
            (worker.data.reqID || '???'),
            'in',
            wt,
            'ms'
        );

        doDone(false, worker.incoming, undefined, wt);
        nextInLine();
    });

    worker.work = function (data, fn) {
        if (!worker.ready) return fn && fn ('tried posting work, but the worker is not ready');
        if (!worker.process) return fn && fn('tried posting work, but no worker process is active');

        if (settings.workLimit && worker.workcount > settings.workLimit) {
            log(3, 'work limit reached for', worker.id, 'restarting..');
            return worker.restart().work(data, fn);
        }

        if (data && data.resources && data.resources.css) {
            log(4, 'using CSS resources');
        }

        worker.data = data;
        worker.incoming = '';
        worker.workcount++;
        worker.ready = false;
        worker.ondone = fn;
        worker.workStartTime = (new Date()).getTime();

        data.id = worker.id;

        //setWorkerTimeout(worker);

        //Send a work start event to the worker script
        log(4, 'phantom', worker.id, '- starting work');

        try {
            //The buffer might fill up, so we send a separate eol signal.
            worker.allowRestart = false;
            worker.process.stdin.write(JSON.stringify(data) + '\nEOL\n', function (key, value) {
                if (value && (typeof value === 'function') ||
                    value instanceof Function) {
                    return value.toString();
                }
                return value;
            });
            worker.working = true;
            worker.allowRestart = true;
        } catch (e) {
            worker.allowRestart = true;
            worker.ready = true;
            log(1, 'phantom', worker.id, '- error starting work', e);
            doDone('error starting work: ' + e);
            worker.restart(true);
        }
    };

    //Process the queue right away
    if (processQueueAfterCreation) {
        nextInLine();
    }

    workers.push(worker);

    return worker;
}

function init(config) {
    killAll();

    config = config || {};

    settings = {
        queueSize: config.queueSize || 5,
        timeoutThreshold: config.timeoutThreshold || 3500,
        maxWorkers: config.maxWorkers || 8,
        initialWorkers: config.initialWorkers || config.maxWorkers || 8,
        worker: config.worker || __dirname + '/../phantom/worker.js',
        //The number of jobs to process before restarting the worker
        //Setting this too high may cause issues, setting it too low causes performance issues..
        workLimit: config.workLimit || 60,
        reaper: typeof config.reaper !== 'undefined' ? config.reaper : true,
        listenToProcessExits: typeof config.listenToProcessExits !== 'undefined'
                                ? config.listenToProcessExits
                                : true
    };

    // == is intentional
    if (settings.listenToProcessExits == 1 || settings.listenToProcessExits === true) {
        attachExitListeners();
    }

    log(4,
        'Pool started:',
        '\n    maxWorkers: ' + settings.maxWorkers,
        '\n    initialWorkers: ' + settings.initialWorkers,
        '\n    workLimit: ' + settings.workLimit,
        '\n    listening to process exit: ' + settings.listenToProcessExits
    );

    // if (settings.reaper) {
        // setInterval(cleaner, 2500);
    // }

    for (var i = 0; i < settings.initialWorkers; i++) {
        spawnWorker();
    }
}

function postWork(data, fn) {
    var foundWorker = false,
        wrk,
        readyList,
        t = (new Date()).getTime()
    ;

    if (!settings) return log(1, 'phantom - tried posting work, but pool not initied');
    log(4, 'phantom - received work, finding available worker');

    readyList = workers.filter(function (worker) {
        // If the worker has spent more than the timeout threshold, restart it.
        // This allows work to take long if there's not much traffic on the server

        if (worker.working && t - worker.workStartTime > settings.timeoutThreshold) {
          worker.restart(true);
        }

        return worker.ready;
    });

    if (readyList.length > 0) {
        //Chose a random worker
        wrk = readyList[Math.round(Math.random() * (readyList.length - 1))];
        log(4, 'phantom - found available worker');
        queueOverflow = 0;
        wrk.work(data, fn);
    } else  {
        //If we haven't reached max yet, we can just spawn a new one
        if (workers.length < settings.maxWorkers) {
            log(4, 'phantom - pool is not maxed, posting work to new spawn');
            queueOverflow = 0;
            spawnWorker().work(data, fn);
        } else {

            //Check if we can revive a dead worker
            workers.some(function (worker) {
                if (!worker.alive) {
                    log(3, 'phantom - restarted worker');
                    worker.restart().work(data, fn);
                    foundWorker = true;
                    return true;
                }
            });

            if (!foundWorker) {
                if (workQueue.length > settings.queueSize) {
                    queueOverflow++;
                    log(2, 'phantom - queue is full, dropping request');
                    return fn && fn('server too busy, please try again later');
                } else {
                    queueOverflow = 0;
                    log(3, 'phantom - queuing work. Queue size was', workQueue.length);
                    workQueue.push({
                        data: data,
                        fn: fn
                    });
                }
            }
        }
    }
}

module.exports = {
    init: init,
    kill: killAll,
    postWork: postWork
};
