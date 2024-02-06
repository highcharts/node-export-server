import { writeFileSync } from 'fs';

import exporter from '../../lib/index.js';

// Export settings with new options structure (Puppeteer)
const exportSettings = {
  export: {
    type: 'png',
    outfile: './samples/module/svg.png',
    scale: 2
  },
  payload: {
    svg: '<svg version="1.1" class="highcharts-root" style="font-family: &quot;Lucida Grande&quot;, &quot;Lucida Sans Unicode&quot;, Arial, Helvetica, sans-serif; font-size: 12px;" xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400" aria-hidden="false" aria-label="Interactive chart"><desc aria-hidden="true">Created with Highcharts 10.2.1</desc><defs aria-hidden="true"><clipPath id="highcharts-u84i73h-13-"><rect x="0" y="0" width="523" height="272" fill="none"></rect></clipPath><clipPath id="highcharts-u84i73h-18-"><rect x="0" y="0" width="523" height="272" fill="none"></rect></clipPath><clipPath id="highcharts-u84i73h-23-"><rect x="67" y="53" width="523" height="272" fill="none"></rect></clipPath></defs><rect fill="#ffffff" class="highcharts-background" x="0" y="0" width="600" height="400" rx="0" ry="0" aria-hidden="true"></rect><rect fill="none" class="highcharts-plot-background" x="67" y="53" width="523" height="272" aria-hidden="true"></rect><g class="highcharts-pane-group" data-z-index="0" aria-hidden="true"></g><g class="highcharts-grid highcharts-xaxis-grid" data-z-index="1" aria-hidden="true"><path fill="none" stroke-dasharray="none" data-z-index="1" class="highcharts-grid-line" d="M 197.5 53 L 197.5 325" opacity="1"></path><path fill="none" stroke-dasharray="none" data-z-index="1" class="highcharts-grid-line" d="M 328.5 53 L 328.5 325" opacity="1"></path><path fill="none" stroke-dasharray="none" data-z-index="1" class="highcharts-grid-line" d="M 458.5 53 L 458.5 325" opacity="1"></path><path fill="none" stroke-dasharray="none" data-z-index="1" class="highcharts-grid-line" d="M 589.5 53 L 589.5 325" opacity="1"></path><path fill="none" stroke-dasharray="none" data-z-index="1" class="highcharts-grid-line" d="M 66.5 53 L 66.5 325" opacity="1"></path></g><g class="highcharts-grid highcharts-yaxis-grid" data-z-index="1" aria-hidden="true"><path fill="none" stroke="#e6e6e6" stroke-width="1" stroke-dasharray="none" data-z-index="1" class="highcharts-grid-line" d="M 67 325.5 L 590 325.5" opacity="1"></path><path fill="none" stroke="#e6e6e6" stroke-width="1" stroke-dasharray="none" data-z-index="1" class="highcharts-grid-line" d="M 67 271.5 L 590 271.5" opacity="1"></path><path fill="none" stroke="#e6e6e6" stroke-width="1" stroke-dasharray="none" data-z-index="1" class="highcharts-grid-line" d="M 67 216.5 L 590 216.5" opacity="1"></path><path fill="none" stroke="#e6e6e6" stroke-width="1" stroke-dasharray="none" data-z-index="1" class="highcharts-grid-line" d="M 67 162.5 L 590 162.5" opacity="1"></path><path fill="none" stroke="#e6e6e6" stroke-width="1" stroke-dasharray="none" data-z-index="1" class="highcharts-grid-line" d="M 67 107.5 L 590 107.5" opacity="1"></path><path fill="none" stroke="#e6e6e6" stroke-width="1" stroke-dasharray="none" data-z-index="1" class="highcharts-grid-line" d="M 67 52.5 L 590 52.5" opacity="1"></path></g><rect fill="none" class="highcharts-plot-border" data-z-index="1" x="67" y="53" width="523" height="272" aria-hidden="true"></rect><g class="highcharts-axis highcharts-xaxis" data-z-index="2" aria-hidden="true"><path fill="none" class="highcharts-axis-line" stroke="#ccd6eb" stroke-width="1" data-z-index="7" d="M 67 325.5 L 590 325.5"></path></g><g class="highcharts-axis highcharts-yaxis" data-z-index="2" aria-hidden="true"><text x="26.04443359375" data-z-index="7" text-anchor="middle" transform="translate(0,0) rotate(270 26.04443359375 189)" class="highcharts-axis-title" style="color: rgb(102, 102, 102); fill: rgb(102, 102, 102);" y="189">Values</text><path fill="none" class="highcharts-axis-line" data-z-index="7" d="M 67 53 L 67 325"></path></g><g class="highcharts-series-group" data-z-index="3" aria-hidden="false"><g class="highcharts-series highcharts-series-0 highcharts-line-series highcharts-color-0" data-z-index="0.1" opacity="1" transform="translate(67,53) scale(1 1)" clip-path="url(#highcharts-u84i73h-18-)" aria-hidden="true"><path fill="none" d="M 65.375 244.8 L 196.125 217.6 L 326.875 190.4 L 457.625 163.2" class="highcharts-graph" data-z-index="1" stroke="#7cb5ec" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></path><path fill="none" d="M 65.375 244.8 L 196.125 217.6 L 326.875 190.4 L 457.625 163.2" data-z-index="2" class="highcharts-tracker-line" stroke-linecap="round" stroke-linejoin="round" stroke="rgba(192,192,192,0.0001)" stroke-width="22"></path></g><g class="highcharts-markers highcharts-series-0 highcharts-line-series highcharts-color-0 highcharts-tracker" data-z-index="0.1" opacity="1" transform="translate(67,53) scale(1 1)" clip-path="none" aria-hidden="false" role="region" tabindex="-1" aria-label="Series 1, line 1 of 2 with 4 data points." style="outline: none;"><path fill="#7cb5ec" d="M 65 249 A 4 4 0 1 1 65.00399999933333 248.99999800000018 Z" opacity="1" class="highcharts-point highcharts-color-0" tabindex="-1" role="img" aria-label="Jan, 1. Series 1." style="outline: none;"></path><path fill="#7cb5ec" d="M 196 222 A 4 4 0 1 1 196.00399999933333 221.99999800000018 Z" opacity="1" class="highcharts-point highcharts-color-0" tabindex="-1" role="img" aria-label="Feb, 2. Series 1." style="outline: none;"></path><path fill="#7cb5ec" d="M 326 194 A 4 4 0 1 1 326.00399999933336 193.99999800000018 Z" opacity="1" class="highcharts-point highcharts-color-0" tabindex="-1" role="img" aria-label="Mar, 3. Series 1." style="outline: none;"></path><path fill="#7cb5ec" d="M 457 167 A 4 4 0 1 1 457.00399999933336 166.99999800000018 Z" opacity="1" class="highcharts-point highcharts-color-0" tabindex="-1" role="img" aria-label="Apr, 4. Series 1." style="outline: none;"></path></g><g class="highcharts-series highcharts-series-1 highcharts-line-series highcharts-color-1" data-z-index="0.1" opacity="1" transform="translate(67,53) scale(1 1)" clip-path="url(#highcharts-u84i73h-18-)" aria-hidden="true"><path fill="none" d="M 65.375 136 L 196.125 108.80000000000001 L 326.875 81.6 L 457.625 54.400000000000006" class="highcharts-graph" data-z-index="1" stroke="#434348" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></path><path fill="none" d="M 65.375 136 L 196.125 108.80000000000001 L 326.875 81.6 L 457.625 54.400000000000006" data-z-index="2" class="highcharts-tracker-line" stroke-linecap="round" stroke-linejoin="round" stroke="rgba(192,192,192,0.0001)" stroke-width="22"></path></g><g class="highcharts-markers highcharts-series-1 highcharts-line-series highcharts-color-1 highcharts-tracker" data-z-index="0.1" opacity="1" transform="translate(67,53) scale(1 1)" clip-path="none" aria-hidden="false" role="region" tabindex="-1" aria-label="Series 2, line 2 of 2 with 4 data points." style="outline: none;"><path fill="#434348" d="M 65 132 L 69 136 L 65 140 L 61 136 Z" opacity="1" class="highcharts-point highcharts-color-1" tabindex="-1" role="img" aria-label="Jan, 5. Series 2." style="outline: none;"></path><path fill="#434348" d="M 196 105 L 200 109 L 196 113 L 192 109 Z" opacity="1" class="highcharts-point highcharts-color-1" tabindex="-1" role="img" aria-label="Feb, 6. Series 2." style="outline: none;"></path><path fill="#434348" d="M 326 78 L 330 82 L 326 86 L 322 82 Z" opacity="1" class="highcharts-point highcharts-color-1" tabindex="-1" role="img" aria-label="Mar, 7. Series 2." style="outline: none;"></path><path fill="#434348" d="M 457 50 L 461 54 L 457 58 L 453 54 Z" opacity="1" class="highcharts-point highcharts-color-1" tabindex="-1" role="img" aria-label="Apr, 8. Series 2." style="outline: none;"></path></g></g><text x="300" text-anchor="middle" class="highcharts-title" data-z-index="4" style="color: rgb(51, 51, 51); font-size: 18px; fill: rgb(51, 51, 51);" y="24" aria-hidden="true">Chart title</text><text x="300" text-anchor="middle" class="highcharts-subtitle" data-z-index="4" style="color: rgb(102, 102, 102); fill: rgb(102, 102, 102);" y="52" aria-hidden="true"></text><text x="10" text-anchor="start" class="highcharts-caption" data-z-index="4" style="color: rgb(102, 102, 102); fill: rgb(102, 102, 102);" y="397" aria-hidden="true"></text><g class="highcharts-legend highcharts-no-tooltip" data-z-index="7" transform="translate(214,359)" aria-hidden="true"><rect fill="none" class="highcharts-legend-box" rx="0" ry="0" x="0" y="0" width="171" height="26"></rect><g data-z-index="1"><g><g class="highcharts-legend-item highcharts-line-series highcharts-color-0 highcharts-series-0" data-z-index="1" transform="translate(8,3)"><path fill="none" d="M 0 11 L 16 11" class="highcharts-graph" stroke="#7cb5ec" stroke-width="2"></path><path fill="#7cb5ec" d="M 8 15 A 4 4 0 1 1 8.003999999333336 14.999998000000167 Z" class="highcharts-point" opacity="1"></path><text x="21" text-anchor="start" data-z-index="2" y="15" style="color: rgb(51, 51, 51); cursor: pointer; font-size: 12px; font-weight: bold; fill: rgb(51, 51, 51);">Series 1</text></g><g class="highcharts-legend-item highcharts-line-series highcharts-color-1 highcharts-series-1" data-z-index="1" transform="translate(95.71875,3)"><path fill="none" d="M 0 11 L 16 11" class="highcharts-graph" stroke="#434348" stroke-width="2"></path><path fill="#434348" d="M 8 7 L 12 11 L 8 15 L 4 11 Z" class="highcharts-point" opacity="1"></path><text x="21" y="15" text-anchor="start" data-z-index="2" style="color: rgb(51, 51, 51); cursor: pointer; font-size: 12px; font-weight: bold; fill: rgb(51, 51, 51);">Series 2</text></g></g></g></g><g class="highcharts-axis-labels highcharts-xaxis-labels" data-z-index="7" aria-hidden="true"><text x="132.375" text-anchor="middle" transform="translate(0,0)" style="color: rgb(102, 102, 102); cursor: default; font-size: 11px; fill: rgb(102, 102, 102);" y="344" opacity="1">Jan</text><text x="263.125" text-anchor="middle" transform="translate(0,0)" style="color: rgb(102, 102, 102); cursor: default; font-size: 11px; fill: rgb(102, 102, 102);" y="344" opacity="1">Feb</text><text x="393.875" text-anchor="middle" transform="translate(0,0)" style="color: rgb(102, 102, 102); cursor: default; font-size: 11px; fill: rgb(102, 102, 102);" y="344" opacity="1">Mar</text><text x="524.625" text-anchor="middle" transform="translate(0,0)" style="color: rgb(102, 102, 102); cursor: default; font-size: 11px; fill: rgb(102, 102, 102);" y="344" opacity="1">Apr</text></g><g class="highcharts-axis-labels highcharts-yaxis-labels" data-z-index="7" aria-hidden="true"><text x="52" text-anchor="end" transform="translate(0,0)" style="color: rgb(102, 102, 102); cursor: default; font-size: 11px; fill: rgb(102, 102, 102);" y="329" opacity="1">0</text><text x="52" text-anchor="end" transform="translate(0,0)" style="color: rgb(102, 102, 102); cursor: default; font-size: 11px; fill: rgb(102, 102, 102);" y="275" opacity="1">2</text><text x="52" text-anchor="end" transform="translate(0,0)" style="color: rgb(102, 102, 102); cursor: default; font-size: 11px; fill: rgb(102, 102, 102);" y="220" opacity="1">4</text><text x="52" text-anchor="end" transform="translate(0,0)" style="color: rgb(102, 102, 102); cursor: default; font-size: 11px; fill: rgb(102, 102, 102);" y="166" opacity="1">6</text><text x="52" text-anchor="end" transform="translate(0,0)" style="color: rgb(102, 102, 102); cursor: default; font-size: 11px; fill: rgb(102, 102, 102);" y="111" opacity="1">8</text><text x="52" text-anchor="end" transform="translate(0,0)" style="color: rgb(102, 102, 102); cursor: default; font-size: 11px; fill: rgb(102, 102, 102);" y="57" opacity="1">10</text></g><text x="590" class="highcharts-credits" text-anchor="end" data-z-index="8" y="395" style="cursor: pointer; color: rgb(153, 153, 153); font-size: 9px; fill: rgb(153, 153, 153);" aria-label="Chart credits: Highcharts.com" aria-hidden="false">Highcharts.com</text><g class="highcharts-control-points" data-z-index="99" clip-path="url(#highcharts-u84i73h-23-)" aria-hidden="true"></g></svg>'
  }
};

const start = async () => {
  // Set the new options
  const options = exporter.setOptions(exportSettings);

  // Init a pool for one export
  await exporter.initPool(options);

  // Perform an export
  exporter.startExport(options, (info, error) => {
    // Exit process and display error
    if (error) {
      exporter.log(1, error.message);
      process.exit(1);
    }
    const { outfile, type } = info.options.export;

    // Save the base64 from a buffer to a correct image file
    writeFileSync(
      outfile,
      type !== 'svg' ? Buffer.from(info.result, 'base64') : info.result
    );

    // Kill the pool
    exporter.killPool();
  });
};

start();
