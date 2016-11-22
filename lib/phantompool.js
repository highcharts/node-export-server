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

process.on('exit', doTerminate);

process.on('SIGINT', function (code) {
    process.exit(code);
});

process.on('uncaughtException', function (e) {
    console.log('uncaughtException:', e);
    process.exit(0);
});

function spawnWorker() {
    var worker = {
        data: false,
        ready: true,
        alive: true,
        process: false,
        workStartTime: 0,
        ondone: false,
        //Stop a bunch of workers restarting at the same time
        workcount: settings.workLimit ? Math.round((settings.workLimit / 2) * Math.random()) : 0,
        incoming: '',
        timeoutInterval: false,
        id: ++instCount 
    };

    function flushTimout() {
        clearTimeout(worker.timeoutInterval);
    }

    log(4, 'phantom', worker.id, '- spawning worker');

    if (!settings) return log(1, 'phantom', worker.id, '- tried spawning worker, but pool not inited');

    function doDone(err, data) {
        flushTimout();
        if (worker.ondone) {
            worker.ondone(err, data);
            
            worker.ondone = false;
            worker.ready = true;

            //Process the queue
            if (workQueue.length > 0) {
                var item = workQueue[0];
                workQueue.splice(0, 1);
                worker.work(item.data, item.fn);
            }
        }
    }

    worker.process = phantomjs.exec(settings.worker, (__dirname + '/../'));
    worker.process.stdin.setEncoding('utf-8');
    worker.process.stdout.setEncoding('utf-8');

    worker.process.on('error', function (err) {
        flushTimout();
        log(1, 'phantom worker', worker.id, '-', err);
        log(3, 'phantom - sending complete event with error');
        doDone('error when performing chart generation', err);
    });

    worker.process.stdout.on('data', function (data) {
        if (worker.ready || typeof data === 'undefined') {
            //We're not expecting any data from this worker
            return;
        }

        data = data.toString();

        worker.incoming += data;
        
        //There's no object nesting, and no } inside valid return so this is safe.
        if (data[data.length - 1] !== '}') {
            return;
        }

      //  flushTimout(); 

        try {
            worker.incoming = JSON.parse(worker.incoming + '\n');
        } catch (e) {
            log(1, 'phantom worker', worker.id, 'unexpected data -', e.toString());
            doDone('an error occured when rendering the chart: ' + e.toString());
            return;
        }

        log(3, 
            'phantom worker', 
            worker.id, 
            'finished work', 
            (worker.data.reqID || '???'), 
            'in', 
            ((new Date()).getTime() - worker.workStartTime), 
            'ms'
        );

        doDone(false, worker.incoming);
    });

    worker.process.stderr.on('data', function (data) {
        log(1, 'phantom worker', worker.id, 'error -', data.toString());
    });

    worker.process.on('close', function (code, signal) {
       // flushTimout();
        log(3, 'phantom worker', worker.id, '- process was closed');
        worker.ready = false;
        worker.alive = false;

        if (signal !== 'SIGTERM') {

        }
    });

    worker.restart = function () {
        //flushTimout();

        if (worker.alive) {
            worker.process.kill();            
        }

        worker.ready = false;
        worker.ondone = false;

        log(3, 'restarting worker');

        workers = workers.filter(function (w) {
            return w.id !== worker.id;
        });

        return spawnWorker();
    };

    worker.work = function (data, fn) {
        flushTimout();        

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

        //Time out after 10 seconds
        worker.timeoutInterval = setTimeout(function () {
            log(3, 'worker', worker.id, 'timed out..');                        
            //We need to restart the whole thing so that old requests won't mess
            //things up.
            worker.ondone = false;
            worker.restart();
            return fn && fn('chart creation timed out');
        }, 10000);

        //Send a work start event to the worker script
        log(4, 'phantom', worker.id, '- starting work');

        try {
            //The buffer might fill up, so we send a separate eol signal.
            worker.process.stdin.write(JSON.stringify(data));            
            worker.process.stdin.write('\nEOL\n');            
        } catch (e) {
            log(1, 'phantom', worker.id, '- error starting work', e);
            return fn && fn ('error starting work:', e);   
        }
    };

    workers.push(worker);

    return worker;
}

function init(config) {
    killAll();

    config = config || {};

    settings = {
        maxWorkers: config.maxWorkers || 25,
        initialWorkers: config.initialWorkers || 5,
        worker: config.worker || __dirname + '/../phantom/worker.js',
        //The number of jobs to process before restarting the worker
        //Setting this too high may cause issues, setting it too low causes performance issues..
        workLimit: 60
    };

    for (var i = 0; i < settings.initialWorkers; i++) {
        spawnWorker();
    }
}

function postWork(data, fn) {
    var foundWorker = false,
        wrk,
        readyList
    ;

    if (!settings) return log(1, 'phantom - tried posting work, but pool not initied');
    log(4, 'phantom - received work, finding available worker');    

    readyList = workers.filter(function (worker) {
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
                if (workQueue.length > 30) {
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