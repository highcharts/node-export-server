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

const fs = require("fs");
const log = require("./logger").log;
const ppool = require("./phantompool.js");

//Don't want to deal with mime types inside the worker..
function fixType(type) {
  if (!type) {
    return "png";
  }

  if (type === "image/svg+xml") {
    return "svg";
  }

  type = type.split("/");
  return type[type.length - 1];
}

function guessType(str) {
  var i = str.lastIndexOf("."),
    e = str.substr(i + 1);
  return e;
}

function doExport(exportOptions, chartJson, startTime, fn) {
  var phantomStart = new Date().getTime(),
    outfile =
      exportOptions.outfile ||
      exportOptions.tmpdir + "chart." + fixType(exportOptions.type),
    oldWidth,
    customCode;

  // If the allowCodeExecution flag isn't set, we should refuse the usage
  // of callback, resources, and custom code.
  // Additionally, the worker will refuse to run arbitrary JavaScript.
  if (exportOptions && !exportOptions.allowCodeExecution) {
    if (
      exportOptions.callback ||
      exportOptions.resources ||
      exportOptions.customCode ||
      exportOptions.customcode
    ) {
      // Send back a friendly message saying that the exporter does not support
      // these settings.
      return fn && fn(
        JSON.stringify({
          error: true,
          message: `callback, resources, and customCode have been disabled for this server.

        If you require these options, consider running your own instance of the export server, which can be found here: https://github.com/highcharts/node-export-server.

        If this is your server and you would like to enable these options, start the
        server with the --allowCodeExecution flag.
        `
        })
      );
    }

    exportOptions.callback = false;
    exportOptions.resources = false;
    exportOptions.customCode = false;
    exportOptions.customcode = false;

    // Sanitize the incoming configuration
  }

  if (!exportOptions.type) {
    //Guess export type based on file extension.
    exportOptions.type = guessType(outfile);
  }

  // Clean properties - we want to avoid doing this in the phantom worker to
  // keep it lean and mean.
  if (chartJson) {
    chartJson.chart = chartJson.chart || {};
    chartJson.exporting = chartJson.exporting || {};
    chartJson.exporting.enabled = false;

    if (chartJson.exporting.sourceWidth) {
      chartJson.chart.width = chartJson.exporting.sourceWidth;
    }

    if (chartJson.exporting.sourceHeight) {
      chartJson.chart.height = chartJson.exporting.sourceHeight;
    }

    chartJson.chart.width = chartJson.chart.width || 600;
    chartJson.chart.height = chartJson.chart.height || 400;
  }

  if (fixType(exportOptions.type) === "svg") {
    exportOptions.width = false;
  }

  if (exportOptions.resources && typeof exportOptions.resources === "string") {
    try {
      exportOptions.resources = JSON.parse(exportOptions.resources);
    } catch (e) {
      log(2, "error parsing resources:", e);
      return fn("error parsing resources, check your JSON syntax");
    }
  }

  if (exportOptions.resources && exportOptions.resources.files) {
    try {
      exportOptions.resources.files = exportOptions.resources.files.split(",");
    } catch (e) {
      log(2, "error organizing resource files:", e);
      return fn(
        "error parsing resource files, make sure they are comma separated"
      );
    }
  }

  if (exportOptions.scale && parseInt(exportOptions.scale, 10) > 5) {
    exportOptions.scale = 5;
  }

  if (exportOptions.scale && parseInt(exportOptions.scale, 10) < 1) {
    exportOptions.scale = 1;
  }

  customCode = exportOptions.customCode || exportOptions.customcode || false;

  if (customCode && typeof exportOptions.instr !== "string") {
    try {
      customCode = customCode.toString();
    } catch (e) {
      log(
        1,
        "customCode contains invalid data: must be a function; either stringified or pure"
      );
      customCode = false;
    }
  }

  if (
    exportOptions &&
    typeof exportOptions.themeOptions !== "undefined" &&
    typeof exportOptions.instr !== "string"
  ) {
    try {
      exportOptions.themeOptions = JSON.stringify(exportOptions.themeOptions);
    } catch (e) {}
  }

  function exec() {
    //Post the work to the pool
    ppool.postWork(
      {
        allowCodeExecution: exportOptions.allowCodeExecution,
        width: exportOptions.width,
        callback: exportOptions.callback || false,
        resources: exportOptions.resources || false,
        scale: exportOptions.scale || 1,
        constr: exportOptions.constr,
        chart: chartJson || exportOptions.str,
        svgstr: exportOptions.svg,
        format: fixType(exportOptions.type) || "png",
        out: outfile,
        styledMode: exportOptions.styledMode,
        asyncRendering: exportOptions.asyncRendering,
        async: exportOptions.async || false,
        reqID: exportOptions.reqID || "",
        globalOptions:
          exportOptions.globalOptions || exportOptions.globaloptions || false,
        themeOptions:
          exportOptions.themeOptions || exportOptions.themeoptions || false,
        customCode: customCode,
        dataOptions:
          exportOptions.dataOptions || exportOptions.dataoptions || false
      },
      fn
    );
  }

  // This is kind of hacky, but looking for braces is a good way of knowing
  // if this is a file or not without having to waste time stating.
  // 'Cause no one uses curly braces in filename, right? ...right?
  // One interesting thing here is that this is a huge security issue
  // if this is a file and the options are coming from the http server
  // since it's possible to inject random files from the filesystem with it.
  // It *should* just cause a crash though.
  //
  // UPDATE: Added allowFileResources which is always set to false for HTTP
  // requests to avoid injecting arbitrary files from the fs.
  if (
    exportOptions.allowFileResources &&
    exportOptions.callback &&
    exportOptions.callback.indexOf("{") < 0
  ) {
    fs.readFile(exportOptions.callback, function (err, data) {
      if (err) {
        log(2, "error loading callback:", err);
        return fn && fn("error loading callback script. Check the file path.");
      }
      exportOptions.callback = data.toString();
      exec();
    });
  } else {
    exec();
  }
}

function exportAsString(string, exportOptions, startTime, fn) {
  if (string.trim) {
    string = string.trim();
  }

  //Check if it's svg
  if (
    (string.indexOf && string.indexOf("<svg") >= 0) ||
    string.indexOf("<?xml") >= 0
  ) {
    log(4, "parsing input as svg");
    exportOptions.svg = string;
    return doExport(exportOptions, false, startTime, fn);
  }

  function doStraightInject() {
    //Pass it directly to the phantom script which will run an eval in the
    //document context. This is not cool, but there are some crazy edge cases
    //that make it hard to parse it. People have a tendency of passing
    //straight JavaScript in here, with full comments and other things.
    if (typeof exportOptions.instr !== "undefined") {
      exportOptions.str = exportOptions.instr
        .replace(/\t/g, " ")
        // replace(/\n/g, '').
        // replace(/\r/g, '').
        .trim();

      if (exportOptions.str[exportOptions.str.length - 1] === ";") {
        exportOptions.str = exportOptions.str.substr(
          0,
          exportOptions.str.length - 1
        );
      }

      return doExport(exportOptions, false, startTime, fn);
    } else {
      log(
        1,
        "malformed input detected for",
        exportOptions.reqID || "???",
        "input was",
        JSON.stringify(exportOptions, undefined, "  ")
      );

      return (
        fn &&
        fn(
          "malformed input: Please make sure that your JSON/JavaScript options are sent using the \"options\" attribute, and that if you're using SVG it's unescaped."
        )
      );
    }
  }

  if (exportOptions.forceInject) {
    return doStraightInject();
  }

  var chartJSON;

  try {
    chartJSON = JSON.parse(
      exportOptions.instr
        .replace(/\t/g, " ")
        .replace(/\n/g, "")
        .replace(/\r/g, "")
    );
  } catch (e) {
    // Not valid JSON

    if (exportOptions.allowCodeExecution) {
      return doStraightInject();
    } else {
      // Do not allow straight injection without the allowCodeExecution flag
      return fn && fn(
        JSON.stringify({
          error: true,
          message: `Only JSON configurations and SVG is allowed for this server.

        If you require JavaScript exporting, please consider hosting your own
        export server, as described here: https://github.com/highcharts/node-export-server.

        If this is your server, JavaScript exporting can be enabled by starting the server
        with the --allowCodeExecution flag.

        `
        })
      );
    }
  }

  // Do the export
  return doExport(exportOptions, chartJSON, startTime, fn);
}

/** Function to export a chart
 *  @module chart
 *  @param exportOptions {object} - the export options
 *  @param fn {function} - the function to call when done
 */
module.exports = function (exportOptions, fn) {
  var startTime = new Date().getTime();

  log(4, "starting export");

  if (exportOptions.svg && exportOptions.svg !== "") {
    return exportAsString(exportOptions.svg, exportOptions, startTime, fn);
  }

  exportOptions.instr =
    exportOptions.instr || exportOptions.options || exportOptions.data;

  if (exportOptions.infile && exportOptions.infile.length) {
    log(4, "attempting to export from input file");

    return fs.readFile(exportOptions.infile, function (err, data) {
      if (err) return log(0, "error loading input file:", err);

      exportOptions.instr = data.toString();

      return exportAsString(exportOptions.instr, exportOptions, startTime, fn);
    });
  } else if (exportOptions.instr && exportOptions.instr !== "") {
    log(4, "attempting to export from raw input");

    if (typeof exportOptions.instr === "string") {
      return exportAsString(exportOptions.instr, exportOptions, startTime, fn);
    } else {
      return doExport(exportOptions, exportOptions.instr, startTime, fn);
    }
  } else {
    log(
      1,
      "no input specified",
      JSON.stringify(exportOptions, undefined, "  ")
    );

    return fn && fn("no input given");
  }

  log(1, "invalid input specified");
  return fn && fn("invalid input specified");
};
