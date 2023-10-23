import'colors';import e,{existsSync as t,mkdirSync as o,appendFile as r,readFileSync as i,writeFileSync as n,readFile as s,promises as a}from'fs';import l,{join as c,posix as p}from'path';import d from'body-parser';import u from'cors';import h from'express';import g from'multer';import m from'http';import f from'https';import v from'dotenv';import y from'express-rate-limit';import*as b from'url';import{fileURLToPath as w}from'url';import x from'https-proxy-agent';import k from'axios';import{v4 as T}from'uuid';import{Pool as S}from'tarn';import E from'puppeteer';import H from'node:path';import{randomBytes as C}from'node:crypto';import'prompts';v.config();const R={puppeteer:{args:{value:[],type:'string[]',description:'Array of arguments to send to puppeteer.'}},highcharts:{version:{value:'latest',envLink:'HIGHCHARTS_VERSION',type:'string',description:'Highcharts version to use.'},cdnURL:{value:'https://code.highcharts.com/',envLink:'HIGHCHARTS_CDN',type:'string',description:'The CDN URL of Highcharts scripts to use.'},coreScripts:{envLink:'HIGHCHARTS_CORE_SCRIPTS',value:['highcharts','highcharts-more','highcharts-3d'],type:'string[]',description:'Highcharts core scripts to fetch.'},modules:{envLink:'HIGHCHARTS_MODULES',value:['stock','map','gantt','exporting','export-data','parallel-coordinates','accessibility','annotations-advanced','boost-canvas','boost','data','draggable-points','static-scale','broken-axis','heatmap','tilemap','timeline','treemap','item-series','drilldown','histogram-bellcurve','bullet','funnel','funnel3d','pyramid3d','networkgraph','pareto','pattern-fill','pictorial','price-indicator','sankey','arc-diagram','dependency-wheel','series-label','solid-gauge','sonification','stock-tools','streamgraph','sunburst','variable-pie','variwide','vector','venn','windbarb','wordcloud','xrange','no-data-to-display','drag-panes','debugger','dumbbell','lollipop','cylinder','organization','dotplot','marker-clusters','hollowcandlestick','heikinashi'],type:'string[]',description:'Highcharts modules to fetch.'},indicators:{envLink:'HIGHCHARTS_INDICATORS',value:['indicators-all'],type:'string[]',description:'Highcharts indicators to fetch.'},scripts:{value:['https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.3/moment.min.js','https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.20/lodash.min.js'],type:'string[]',description:'Additional direct scripts/optional dependencies (e.g. moment.js).'}},export:{infile:{value:!1,type:'string',description:'The input file name along with a type (json or svg). It can be a correct JSON or SVG file.'},instr:{value:!1,type:'string',description:'An input in a form of a stringified JSON or SVG file. Overrides the --infile.'},options:{value:!1,type:'string',description:'An alias for the --instr option.'},outfile:{value:!1,type:'string',description:'The output filename along with a type (jpeg, png, pdf or svg). Ignores the --type flag.'},type:{envLink:'EXPORT_DEFAULT_TYPE',value:'png',type:'string',description:'The format of the file to export to. Can be jpeg, png, pdf or svg.'},constr:{envLink:'EXPORT_DEFAULT_CONSTR',value:'chart',type:'string',description:'The constructor to use. Can be chart, stockChart, mapChart or ganttChart.'},defaultHeight:{envLink:'EXPORT_DEFAULT_HEIGHT',value:400,type:'number',description:'The default height of the exported chart. Used when not found any value set.'},defaultWidth:{envLink:'EXPORT_DEFAULT_WIDTH',value:600,type:'number',description:'The default width of the exported chart. Used when not found any value set.'},defaultScale:{envLink:'EXPORT_DEFAULT_SCALE',value:1,type:'number',description:'The default scale of the exported chart. Ranges between 1 and 5.'},height:{type:'number',value:!1,description:'The default height of the exported chart. Overrides the option in the chart settings.'},width:{type:'number',value:!1,description:'The width of the exported chart. Overrides the option in the chart settings.'},scale:{value:!1,type:'number',description:'The scale of the exported chart. Ranges between 1 and 5.'},globalOptions:{value:!1,type:'string',description:'A stringified JSON or a filename with options to be passed into the Highcharts.setOptions.'},themeOptions:{value:!1,type:'string',description:'A stringified JSON or a filename with theme options to be passed into the Highcharts.setOptions.'},batch:{value:!1,type:'string',description:'Starts a batch job. A string that contains input/output pairs: "in=out;in=out;..".'}},customCode:{allowCodeExecution:{envLink:'HIGHCHARTS_ALLOW_CODE_EXECUTION',value:!1,type:'boolean',description:'If set to true, allow for the execution of arbitrary code when exporting.'},allowFileResources:{envLink:'HIGHCHARTS_ALLOW_FILE_RESOURCES',value:!0,type:'boolean',description:'Allow injecting resources from the filesystem. Has no effect when running as a server.'},customCode:{value:!1,type:'string',description:'A function to be called before chart initialization. Can be a filename with the js extension.'},callback:{value:!1,type:'string',description:'A JavaScript file with a function to run on construction.'},resources:{value:!1,type:'string',description:'An additional resource in a form of stringified JSON. It can contain files, js and css sections.'},loadConfig:{value:!1,type:'string',description:'A file that contains a pre-defined config to use.'},createConfig:{value:!1,type:'string',description:'Allows to set options through a prompt and save in a provided config file.'}},server:{enable:{envLink:'HIGHCHARTS_SERVER_ENABLE',value:!1,type:'boolean',cliName:'enableServer',description:'If set to true, starts a server on 0.0.0.0.'},host:{envLink:'HIGHCHARTS_SERVER_HOST',value:'0.0.0.0',type:'string',description:'The hostname of the server. Also starts a server listening on the supplied hostname.'},port:{envLink:'HIGHCHARTS_SERVER_PORT',value:7801,type:'number',description:'The port to use for the server. Defaults to 7801.'},ssl:{enable:{envLink:'HIGHCHARTS_SERVER_SSL_ENABLE',value:!1,type:'boolean',cliName:'enableSsl',description:'Enables the SSL protocol.'},force:{envLink:'HIGHCHARTS_SERVER_SSL_FORCE',value:!1,type:'boolean',cliName:'sslForced',description:'If set to true, forces the server to only serve over HTTPS.'},port:{envLink:'HIGHCHARTS_SERVER_SSL_PORT',value:443,type:'number',cliName:'sslPort',description:'The port on which to run the SSL server.'},certPath:{envLink:'HIGHCHARTS_SSL_CERT_PATH',value:'',type:'string',description:'The path to the SSL certificate/key.'}},rateLimiting:{enable:{envLink:'HIGHCHARTS_RATE_LIMIT_ENABLE',value:!1,type:'boolean',cliName:'enableRateLimiting',description:'Enables rate limiting.'},maxRequests:{envLink:'HIGHCHARTS_RATE_LIMIT_MAX',value:10,type:'number',description:'Max requests allowed in a one minute.'},skipKey:{envLink:'HIGHCHARTS_RATE_LIMIT_SKIP_KEY',value:'',type:'number|string',description:'Allows bypassing the rate limiter and should be provided with skipToken argument.'},skipToken:{envLink:'HIGHCHARTS_RATE_LIMIT_SKIP_TOKEN',value:'',type:'number|string',description:'Allows bypassing the rate limiter and should be provided with skipKey argument.'}}},pool:{initialWorkers:{envLink:'HIGHCHARTS_POOL_MIN_WORKERS',value:6,type:'number',description:'The number of initial workers to spawn.'},maxWorkers:{envLink:'HIGHCHARTS_POOL_MAX_WORKERS',value:6,type:'number',description:'The number of max workers to spawn.'},workLimit:{envLink:'HIGHCHARTS_POOL_WORK_LIMIT',value:40,type:'number',description:'The pieces of work that can be performed before restarting process.'},queueSize:{envLink:'HIGHCHARTS_POOL_QUEUE_SIZE',value:10,type:'number',description:'The size of the request overflow queue.'},timeoutThreshold:{envLink:'HIGHCHARTS_POOL_TIMEOUT',value:5e3,type:'number',description:'The number of milliseconds before timing out.'},acquireTimeout:{envLink:'HIGHCHARTS_POOL_ACQUIRE_TIMEOUT',value:3e3,type:'number',description:'The number of milliseconds to wait for acquiring a resource.'},reaper:{envLink:'HIGHCHARTS_POOL_ENABLE_REAPER',value:!0,type:'boolean',description:'Whether or not to evict workers after a certain time period.'},benchmarking:{envLink:'HIGHCHARTS_POOL_BENCHMARKING',value:!1,type:'boolean',description:'Enable benchmarking.'},listenToProcessExits:{envLink:'HIGHCHARTS_POOL_LISTEN_TO_PROCESS_EXITS',value:!0,type:'boolean',description:'Set to false in order to skip attaching process.exit handlers.'}},payload:{},logging:{level:{envLink:'HIGHCHARTS_LOG_LEVEL',value:4,type:'number',cliName:'logLevel',description:'The log level (0: silent, 1: error, 2: warning, 3: notice, 4: verbose).'},file:{envLink:'HIGHCHARTS_LOG_FILE',value:'highcharts-export-server.log',type:'string',cliName:'logFile',description:'A name of a log file. The --logDest also needs to be set to enable file logging.'},dest:{envLink:'HIGHCHARTS_LOG_DEST',value:'log/',type:'string',cliName:'logDest',description:'The path to store log files. Also enables file logging.'}},ui:{enable:{envLink:'HIGHCHARTS_UI_ENABLE',value:!1,type:'boolean',cliName:'enableUi',description:'Enables the UI for the export server.'},route:{envLink:'HIGHCHARTS_UI_ROUTE',value:'/',type:'string',cliName:'uiRoute',description:'The route to attach the UI to.'}},other:{noLogo:{envLink:'HIGHCHARTS_NO_LOGO',value:!1,type:'boolean',description:'Skip printing the logo on a startup. Will be replaced by a simple text.'}}};R.puppeteer.args.value.join(','),R.highcharts.version.value,R.highcharts.cdnURL.value,R.highcharts.modules.value,R.highcharts.scripts.value.join(','),R.export.type.value,R.export.constr.value,R.export.defaultHeight.value,R.export.defaultWidth.value,R.export.defaultScale.value,R.customCode.allowCodeExecution.value,R.customCode.allowFileResources.value,R.server.enable.value,R.server.host.value,R.server.port.value,R.server.ssl.enable.value,R.server.ssl.force.value,R.server.ssl.port.value,R.server.ssl.certPath.value,R.server.rateLimiting.enable.value,R.server.rateLimiting.maxRequests.value,R.server.rateLimiting.skipKey.value,R.server.rateLimiting.skipToken.value,R.pool.initialWorkers.value,R.pool.maxWorkers.value,R.pool.workLimit.value,R.pool.queueSize.value,R.pool.timeoutThreshold.value,R.pool.acquireTimeout.value,R.pool.reaper.value,R.pool.benchmarking.value,R.pool.listenToProcessExits.value,R.logging.level.value,R.logging.file.value,R.logging.dest.value,R.ui.enable.value,R.ui.route.value,R.other.noLogo.value;const L={},O=[],_=(e,t='')=>{Object.keys(e).forEach((o=>{if(!['puppeteer','highcharts'].includes(o)){const i=e[o];let n;void 0===i.value?_(i,`${t}.${o}`):(i.envLink&&('boolean'===i.type?i.value=(r=[process.env[i.envLink],i.value].find((e=>e||'false'===e)),!['false','undefined','null','NaN','0',''].includes(r)&&!!r):'number'===i.type?(n=+process.env[i.envLink],i.value=n>=0?n:i.value):i.type.indexOf(']')>=0&&process.env[i.envLink]?i.value=process.env[i.envLink].split(','):i.value=process.env[i.envLink]||i.value,O.push({name:i.envLink,description:i.description,type:i.type})),L[i.cliName||o]=`${t}.${o}`.substring(1));}var r;}));};_(R);let A={toConsole:!0,toFile:!1,pathCreated:!1,levelsDesc:[{title:'error',color:'red'},{title:'warning',color:'yellow'},{title:'notice',color:'blue'},{title:'verbose',color:'gray'}],listeners:[]};for(const[e,t]of Object.entries(R.logging))A[e]=t.value;const $=(...e)=>{const[i,...n]=e,{level:s,levelsDesc:a}=A;if(0===i||i>s||s>a.length)return;const l=`${(new Date).toString().split('(')[0].trim()} [${a[i-1].title}] -`;A.listeners.forEach((e=>{e(l,n.join(' '));})),A.toFile&&(A.pathCreated||(!t(A.dest)&&o(A.dest),A.pathCreated=!0),r(`${A.dest}${A.file}`,[l].concat(n).join(' ')+'\n',(e=>{e&&(console.log(`[logger] Unable to write to log file: ${e}`),A.toFile=!1);}))),A.toConsole&&console.log.apply(void 0,[l.toString()[A.levelsDesc[i-1].color]].concat(n));},I=w(new URL('../.',import.meta.url)),P=(e,t=/\s\s+/g,o=' ')=>e.replaceAll(t,o).trim(),N=(e,t)=>{const o=['png','jpeg','pdf','svg'];if(t){const r=t.split('.').pop();o.includes(r)&&e!==r&&(e=r);}return{'image/png':'png','image/jpeg':'jpeg','application/pdf':'pdf','image/svg+xml':'svg'}[e]||o.find((t=>t===e))||'png';};function j(e,t){try{const o=JSON.parse('string'!=typeof e?JSON.stringify(e):e);return'string'!=typeof o&&t?JSON.stringify(o):o;}catch(e){return!1;}}const G=e=>{if(null===e||'object'!=typeof e)return e;const t=Array.isArray(e)?[]:{};for(const o in e)Object.prototype.hasOwnProperty.call(e,o)&&(t[o]=G(e[o]));return t;},W=(e,t,o=[])=>{const r=G(e);for(const[e,n]of Object.entries(t))r[e]='object'!=typeof(i=n)||Array.isArray(i)||null===i||o.includes(e)||void 0===r[e]?void 0!==n?n:r[e]:W(r[e],n,o);var i;return r;},U=(e,t)=>JSON.stringify(e,((e,o)=>('string'==typeof o&&((o=o.trim()).startsWith('function(')||o.startsWith('function ('))&&o.endsWith('}')&&(o=t?`EXP_FUN${(o+'').replaceAll(/\n|\t|\r/g,' ')}EXP_FUN`:void 0),'function'==typeof o?`EXP_FUN${(o+'').replaceAll(/\n|\t|\r/g,' ')}EXP_FUN`:o))).replaceAll(/"EXP_FUN|EXP_FUN"/g,''),F=e=>!['false','undefined','null','NaN','0',''].includes(e)&&!!e,M=(e,t)=>{if(e&&'string'==typeof e)return(e=e.trim()).endsWith('.js')?!!t&&M(i(e,'utf8')):e.startsWith('function()')||e.startsWith('function ()')||e.startsWith('()=>')||e.startsWith('() =>')?`(${e})()`:e.replace(/;$/,'');};var q=(e,t)=>{const o='Too many requests, you have been rate limited. Please try again later.',r={max:t.maxRequests||30,window:t.window||1,delay:t.delay||0,trustProxy:t.trustProxy||!1,skipKey:t.skipKey||!1,skipToken:t.skipToken||!1};r.trustProxy&&e.enable('trust proxy');const i=y({windowMs:60*r.window*1e3,max:r.max,delayMs:r.delay,handler:(e,t)=>{t.format({json:()=>{t.status(429).send({message:o});},default:()=>{t.status(429).send(o);}});},skip:e=>!1!==r.skipKey&&!1!==r.skipToken&&e.query.key===r.skipKey&&e.query.access_token===r.skipToken&&($(4,'[rate-limiting] Skipping rate limiter.'),!0)});e.use(i),$(3,P(`[rate-limiting] Enabled rate limiting: ${r.max} requests\n      per ${r.window} minute per IP, trusting proxy:\n      ${r.trustProxy}.`));};v.config();const D=c(I,'.cache'),V={cdnURL:'https://code.highcharts.com/',activeManifest:{},sources:'',hcVersion:''};let J=!1;const z=()=>V.hcVersion=V.sources.substr(0,V.sources.indexOf('*/')).replace('/*','').replace('*/','').replace(/\n/g,'').trim(),K=async(e,t)=>{try{$(4,`[cache] Fetching script ${e}.`);const o=t?{agent:t,timeout:+process.env.PROXY_SERVER_TIMEOUT||5e3}:{};e.endsWith('.js')&&(e=e.substring(0,e.length-3));const r=await k.get(`${e}.js`,o);if(200===r.status)return r.text();throw`${r.status}`;}catch(t){throw $(1,`[cache] Error fetching script ${e}: ${t}.`),t;}},X=async(e,t)=>{const{coreScripts:o,modules:r,indicators:i,scripts:s}=e,a='latest'!==e.version&&e.version?`${e.version}/`:'';$(3,'[cache] Updating cache to Highcharts ',a);const l=[...o.map((e=>`${a}${e}`)),...r.map((e=>'map'===e?`maps/${a}modules/${e}`:`${a}modules/${e}`)),...i.map((e=>`stock/${a}indicators/${e}`))];let c;const p=process.env.PROXY_SERVER_HOST,d=process.env.PROXY_SERVER_PORT;p&&d&&(c=new x({host:p,port:+d}));const u={};try{return V.sources=(await Promise.all([...l.map((async t=>{const o=await K(`${e.cdnURL||V.cdnURL}${t}`,c);return'string'==typeof o&&(u[t.replace(/(.*)\/|(.*)modules\/|stock\/(.*)indicators\/|maps\/(.*)modules\//gi,'')]=1),o;})),...s.map((e=>K(e,c)))])).join(';\n'),z(),n(t,V.sources),u;}catch(e){$(1,'[cache] Unable to update local Highcharts cache.');}},B=async e=>{let r;const s=c(D,'manifest.json'),a=c(D,'sources.js');if(J=e,!t(D)&&o(D),t(s)){let t=!1;const o=JSON.parse(i(s));if(o.modules&&Array.isArray(o.modules)){const e={};o.modules.forEach((t=>e[t]=1)),o.modules=e;}const{modules:n,coreScripts:l,indicators:c}=e,p=n.length+l.length+c.length;o.version!==e.version?($(3,'[cache] Highcharts version mismatch in cache, need to re-fetch.'),t=!0):Object.keys(o.modules||{}).length!==p?($(3,'[cache] Cache and requested modules does not match, need to re-fetch.'),t=!0):t=(e.modules||[]).some((e=>{if(!o.modules[e])return $(3,`[cache] The ${e} missing in cache, need to re-fetch.`),!0;})),t?r=await X(e,a):($(3,'[cache] Dependency cache is up to date, proceeding.'),V.sources=i(a,'utf8'),r=o.modules,z());}else $(3,'[cache] Fetching and caching Highcharts dependencies.'),r=await X(e,a);await(async(e,t)=>{const o={version:e.version,modules:t||{}};V.activeManifest=o,$(4,'[cache] writing new manifest');try{n(c(D,'manifest.json'),JSON.stringify(o),'utf8');}catch(e){$(1,`[cache] Error writing cache manifest: ${e}.`);}})(e,r);};var Y=async e=>!!J&&await B(Object.assign(J,{version:e})),Q=()=>V,Z=()=>V.hcVersion;const ee=C(64).toString('base64url'),te=H.join('tmp',`puppeteer-${ee}`),oe=[`--user-data-dir=${H.join(te,'profile')}`,'--autoplay-policy=user-gesture-required','--disable-background-networking','--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-breakpad','--disable-client-side-phishing-detection','--disable-component-update','--disable-default-apps','--disable-dev-shm-usage','--disable-domain-reliability','--disable-extensions','--disable-features=AudioServiceOutOfProcess','--disable-hang-monitor','--disable-ipc-flooding-protection','--disable-notifications','--disable-offer-store-unmasked-wallet-cards','--disable-popup-blocking','--disable-print-preview','--disable-prompt-on-repost','--disable-renderer-backgrounding','--disable-session-crashed-bubble','--disable-setuid-sandbox','--disable-speech-api','--disable-sync','--hide-crash-restore-bubble','--hide-scrollbars','--ignore-gpu-blacklist','--metrics-recording-only','--mute-audio','--no-default-browser-check','--no-first-run','--no-pings','--no-sandbox','--no-zygote','--password-store=basic','--use-mock-keychain'],re=b.fileURLToPath(new URL('.',import.meta.url)),ie=e.readFileSync(re+'/../templates/template.html','utf8');let ne;const se=async()=>{if(!ne)return!1;const e=await ne.newPage();return await e.setContent(ie),await e.addScriptTag({path:re+'/../.cache/sources.js'}),await e.evaluate((()=>window.setupHighcharts())),e.on('pageerror',(async t=>{$(1,'[page error]',t),await e.$eval('#container',((e,t)=>{window._displayErrors&&(e.innerHTML=t);}),`<h1>Chart input data error</h1>${t.toString()}`);})),e;},ae=async()=>await ne.close();const le=b.fileURLToPath(new URL('.',import.meta.url)),ce=async(e,t,o)=>await e.evaluate(((e,t)=>window.triggerExport(e,t)),t,o);var pe=async(e,t,o)=>{const r=[],n=async e=>{for(const e of r)await e.dispose();await e.evaluate((()=>{const[,...e]=document.getElementsByTagName('script'),[,...t]=document.getElementsByTagName('style'),[...o]=document.getElementsByTagName('link');for(const r of[...e,...t,...o])r.remove();}));};try{const s=()=>{};$(4,'[export] Determining export path.');const a=o.export;await e.evaluate((()=>requestAnimationFrame((()=>{}))));const c=a?.options?.chart?.displayErrors&&Q().activeManifest.modules.debugger;await e.evaluate((e=>window._displayErrors=e),c);const p=()=>{};let d;if(t.indexOf&&(t.indexOf('<svg')>=0||t.indexOf('<?xml')>=0)){if($(4,'[export] Treating as SVG.'),'svg'===a.type)return t;d=!0;const o=()=>{};await e.setContent((e=>`\n<!DOCTYPE html>\n<html lang='en-US'>\n  <head>\n    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">\n    <title>Highcarts Export</title>\n  </head>\n  <style>\n    \n\nhtml, body {\n  margin: 0;\n  padding: 0;\n  box-sizing: border-box;\n}\n\n#table-div, #sliders, #datatable, #controls, .ld-row {\n  display: none;\n  height: 0;\n}\n\n#chart-container {\n  box-sizing: border-box;\n  margin: 0;\n  overflow: auto;\n  font-size: 0;\n}\n\n#chart-container > figure, div {\n  margin-top: 0 !important;\n  margin-bottom: 0 !important;\n}\n\n\n  </style>\n  <body>\n    <div id="chart-container">\n      ${e}\n    </div>\n  </body>\n</html>\n\n`)(t)),o();}else if($(4,'[export] Treating as config.'),a.strInj){const t=()=>{};await ce(e,{chart:{height:a.height,width:a.width}},o),t();}else{t.chart.height=a.height,t.chart.width=a.width;const r=()=>{};await ce(e,t,o),r();}p();const u=()=>{},h=o.customCode.resources;if(h){if(h.js&&r.push(await e.addScriptTag({content:h.js})),h.files)for(const t of h.files)try{const o=!t.startsWith('http');r.push(await e.addScriptTag(o?{content:i(t,'utf8')}:{url:t}));}catch(e){$(4,'[export] JS file not found.');}const t=()=>{};if(h.css){let t=h.css.match(/@import\s*([^;]*);/g);if(t)for(let i of t)i&&(i=i.replace('url(','').replace('@import','').replace(/"/g,'').replace(/'/g,'').replace(/;/,'').replace(/\)/g,'').trim(),i.startsWith('http')?r.push(await e.addStyleTag({url:i})):o.customCode.allowFileResources&&r.push(await e.addStyleTag({path:l.join(le,i)})));r.push(await e.addStyleTag({content:h.css.replace(/@import\s*([^;]*);/g,'')||' '}));}t();}u();const g=d?await e.$eval('#chart-container svg:first-of-type',(async(e,t)=>({chartHeight:e.height.baseVal.value*t,chartWidth:e.width.baseVal.value*t})),parseFloat(a.scale)):await e.evaluate((async()=>{const{chartHeight:e,chartWidth:t}=window.Highcharts.charts[0];return{chartHeight:e,chartWidth:t};})),m=()=>{},f=Math.ceil(g?.chartHeight||a.height),v=Math.ceil(g?.chartWidth||a.width);await e.setViewport({height:f,width:v,deviceScaleFactor:d?1:parseFloat(a.scale)});const y=d?e=>{document.body.style.zoom=e,document.body.style.margin='0px';}:()=>{document.body.style.zoom=1;};await e.evaluate(y,parseFloat(a.scale));const{height:b,width:w,x:x,y:k}=await(e=>e.$eval('#chart-container',(e=>{const{x:t,y:o,width:r,height:i}=e.getBoundingClientRect();return{x:t,y:o,width:r,height:Math.trunc(i>1?i:500)};})))(e);let T;d||await e.setViewport({width:Math.round(w),height:Math.round(b),deviceScaleFactor:parseFloat(a.scale)}),m();const S=()=>{};if('svg'===a.type)T=await(async e=>await e.$eval('#container svg:first-of-type',(e=>e.outerHTML)))(e);else if('png'===a.type||'jpeg'===a.type)T=await(async(e,t,o,r)=>await Promise.race([e.screenshot({type:t,encoding:o,clip:r}),new Promise(((e,t)=>setTimeout((()=>t(new Error('Rasterization timeout'))),1500)))]))(e,a.type,'base64',{width:v,height:f,x:x,y:k});else{if('pdf'!==a.type)throw`Unsupported output format ${a.type}`;T=await(async(e,t,o,r)=>await e.pdf({height:t+1,width:o,encoding:r}))(e,f,v,'base64');}return await e.evaluate((()=>{const e=Highcharts.charts;if(e.length)for(const t of e)t&&t.destroy(),Highcharts.charts.shift();})),S(),s(),await n(e),T;}catch(t){return await n(e),$(1,`[export] Error encountered during export: ${t}`),t;}};const de=e=>{let t={};for(const[o,r]of Object.entries(e))t[o]=Object.prototype.hasOwnProperty.call(r,'value')?r.value:de(r);return t;};let ue=!1,he={};const ge=e=>{const{chart:t,exporting:o}=e.export?.options||j(e.export?.instr),r=j(e.export?.globalOptions);let i=((e,t=1)=>{const o=Math.pow(10,t||0);return Math.round(+e*o)/o;})(e.export?.scale||o?.scale||r?.exporting?.scale||e.export?.defaultScale||1);return i>5?i=5:i<.1&&(i=1),{height:e.export?.height||o?.sourceHeight||t?.height||r?.exporting?.sourceHeight||r?.chart?.height||e.export?.defaultHeight||400,width:e.export?.width||o?.sourceWidth||t?.width||r?.exporting?.sourceWidth||r?.chart?.width||e.export?.defaultWidth||600,scale:i};},me=(e,t,o,r)=>{let{export:n,customCode:s}=e;const a='boolean'==typeof s.allowCodeExecution?s.allowCodeExecution:ue;if(s?'string'==typeof e.customCode.resources&&(e.customCode.resources=((e=!1,t)=>{const o=['js','css','files'];let r=e,n=!1;if(t&&e.endsWith('.json'))try{e?e&&e.endsWith('.json')?r=j(i(e,'utf8')):(r=j(e),!0===r&&(r=j(i('resources.json','utf8')))):r=j(i('resources.json','utf8'));}catch(e){return $(3,'[cli] No resources found.');}else r=j(e),t||delete r.files;for(const e in r)o.includes(e)?n||(n=!0):delete r[e];return n?(r.files&&(r.files=r.files.map((e=>e.trim())),(!r.files||r.files.length<=0)&&delete r.files),r):$(3,'[cli] No resources found.');})(e.customCode.resources,F(e.customCode.allowFileResources))):s=e.customCode={},!a&&s){if(s.callback||s.resources||s.customCode)return o&&o(!1,{error:!0,message:P('The callback, resources and customCode have been disabled for this\n            server.')});s.callback=!1,s.resources=!1,s.customCode=!1;}if(t&&(t.chart=t.chart||{},t.exporting=t.exporting||{},t.exporting.enabled=!1),n.constr=n.constr||'chart',n.type=N(n.type,n.outfile),'svg'===n.type&&(n.width=!1),['globalOptions','themeOptions'].forEach((e=>{try{n&&n[e]&&('string'==typeof n[e]&&n[e].endsWith('.json')?n[e]=j(i(n[e],'utf8'),!0):n[e]=j(n[e],!0));}catch(t){n[e]={},$(1,`[chart] The ${e} not found.`);}})),s.allowCodeExecution&&(s.customCode=M(s.customCode,s.allowFileResources)),s&&s.callback&&s.callback?.indexOf('{')<0)if(s.allowFileResources)try{s.callback=i(s.callback,'utf8');}catch(e){$(2,`[chart] Error loading callback: ${e}.`),s.callback=!1;}else s.callback=!1;e.export={...e.export,...ge(e)},Oe(n.strInj||t||r,e).then((e=>o(e))).catch((e=>($(0,'[chart] When posting work:',e),o(!1,e))));},fe=(e,t)=>{try{let o,r=e.export.instr||e.export.options;return'string'!=typeof r&&(o=r=U(r,e.customCode?.allowCodeExecution)),o=r.replaceAll(/\t|\n|\r/g,'').trim(),';'===o[o.length-1]&&(o=o.substring(0,o.length-1)),e.export.strInj=o,me(e,!1,t);}catch(o){const r=P(`Malformed input detected for ${e.export?.requestId||'?'}:\n      Please make sure that your JSON/JavaScript options\n      are sent using the "options" attribute, and that if you're using\n      SVG, it is unescaped.`);return $(1,r),t&&t(!1,JSON.stringify({error:!0,message:r}));}},ve=(e,t,o)=>{const{allowCodeExecution:r}=t.customCode;if(e.indexOf('<svg')>=0||e.indexOf('<?xml')>=0)return $(4,'[chart] Parsing input as SVG.'),me(t,!1,o,e);try{const r=JSON.parse(e.replaceAll(/\t|\n|\r/g,' '));return me(t,r,o);}catch(e){return F(r)?fe(t,o):o&&o(!1,{error:!0,message:P('Only JSON configurations and SVG is allowed for this server. If\n            this is your server, JavaScript exporting can be enabled by starting\n            the server with the --allowCodeExecution flag.')});}};var ye={startExport:async(e,t)=>{$(4,'[chart] Starting exporting process.');const o=((e,t={})=>{let o={};return e.svg?(o=t,o.export.type=e.type||e.export.type,o.export.scale=e.scale||e.export.scale,o.export.outfile=e.outfile||e.export.outfile,o.payload={svg:e.svg}):o=W(t,e,['options','globalOptions','themeOptions','resources']),o.export.outfile=o.export?.outfile||`chart.${o.export?.type||'png'}`,o;})(e,he),r=o.export;return o.payload?.svg&&''!==o.payload.svg?ve(o.payload.svg.trim(),o,t):r.infile&&r.infile.length?($(4,'[chart] Attempting to export from an input file.'),s(r.infile,'utf8',((e,r)=>e?$(1,`[chart] Error loading input file: ${e}.`):(o.export.instr=r,ve(o.export.instr.trim(),o,t))))):r.instr&&''!==r.instr||r.options&&''!==r.options?($(4,'[chart] Attempting to export from a raw input.'),F(o.customCode?.allowCodeExecution)?fe(o,t):'string'==typeof r.instr?ve(r.instr.trim(),o,t):me(o,r.instr||r.options,t)):($(1,P(`[chart] No input specified.\n        ${JSON.stringify(r,void 0,'  ')}.`)),t&&t(!1,{error:!0,message:'No input specified.'}));},getAllowCodeExecution:()=>ue,setAllowCodeExecution:e=>{ue=F(e);},setPoolOptions:e=>{he=e;},findChartSize:ge};let be,we=0,xe=0,ke=0,Te=0,Se=0,Ee={},He=!1;const Ce={create:async()=>{const e=T();let t=!1;const o=(new Date).getTime();try{if(t=await se(),!t||t.isClosed())throw'invalid page';$(3,`[pool] Successfully created a worker ${e} - took ${(new Date).getTime()-o} ms.`);}catch(e){throw $(1,`[pool] Error creating a new page in pool entry creation! ${e}`),'Error creating page';}return{id:e,page:t,workCount:Math.round(Math.random()*(Ee.workLimit/2))};},validate:e=>!(Ee.workLimit&&++e.workCount>Ee.workLimit)||($(3,'[pool] Worker failed validation:',`exceeded work limit (limit is ${Ee.workLimit})`),!1),destroy:e=>{$(3,`[pool] Destroying pool entry ${e.id}.`),e.page&&e.page.close();},log:(e,t)=>console.log(`${t}: ${e}`)},Re=async e=>{be=e.puppeteerArgs;try{await(async e=>{const t=[...oe,...e||[]];if(!ne){let e=0;const o=async()=>{try{$(3,'[browser] attempting to get a browser instance (try',e+')'),ne=await E.launch({headless:'new',args:t,userDataDir:'./tmp/'});}catch(t){$(0,'[browser]',t),++e<25?($(3,'[browser] failed:',t),await new Promise((e=>setTimeout(e,4e3))),await o()):$(0,'Max retries reached');}};try{await o();}catch(e){return $(0,'[browser] Unable to open browser'),!1;}if(!ne)return $(0,'[browser] Unable to open browser'),!1;}return ne;})(be);}catch(e){$(0,'[pool|browser]',e);}if(Ee=e&&e.pool?{...e.pool}:{},$(3,'[pool] Initializing pool:',`min ${Ee.initialWorkers}, max ${Ee.maxWorkers}.`),He)return $(4,'[pool] Already initialized, please kill it before creating a new one.');Ee.listenToProcessExits&&($(4,'[pool] Attaching exit listeners to the process.'),process.on('exit',(async()=>{await Le();})),process.on('SIGINT',((e,t)=>{$(4,`The ${e} event with code: ${t}.`),process.exit(1);})),process.on('SIGTERM',((e,t)=>{$(4,`The ${e} event with code: ${t}.`),process.exit(1);})),process.on('uncaughtException',(async(e,t)=>{$(4,`The ${t} error, message: ${e.message}.`);})));try{He=new S({...Ce,min:Ee.initialWorkers,max:Ee.maxWorkers,createRetryIntervalMillis:200,createTimeoutMillis:Ee.acquireTimeout,acquireTimeoutMillis:Ee.acquireTimeout,destroyTimeoutMillis:Ee.acquireTimeout,idleTimeoutMillis:Ee.timeoutThreshold,reapIntervalMillis:1e3,propagateCreateError:!1}),He.on('createFail',((e,t)=>{$(1,`[pool] Error when creating worker of an event id ${e}:`,t);})),He.on('acquireFail',((e,t)=>{$(1,`[pool] Error when acquiring worker of an event id ${e}:`,t);})),He.on('destroyFail',((e,t,o)=>{$(1,`[pool] Error when destroying worker of an id ${t.id}, event id ${e}:`,o);})),He.on('release',(e=>{$(4,`[pool] Releasing a worker of an id ${e.id}`);})),He.on('destroySuccess',((e,t)=>{$(4,`[pool] Destroyed a worker of an id ${t.id}`);}));const e=[];for(let t=0;t<Ee.initialWorkers;t++)e.push(await He.acquire().promise);e.forEach((e=>{He.release(e);})),$(3,`[pool] The pool is ready with ${Ee.initialWorkers} initial resources waiting.`);}catch(e){throw $(1,`[pool] Couldn't create the worker pool ${e}`),e;}};async function Le(){$(3,'[pool] Killing all workers.'),ye.setPoolOptions({});try{await ae();}catch{return void $(4,'[pool] Worker has already been killed.');}return!He||He.destroy();}const Oe=async(e,t)=>{let o;const r=e=>{throw++Te,o&&He.release(o),'In pool.postWork: '+e;};if($(4,'[pool] Work received, starting to process.'),Ee.benchmarking&&_e(),++xe,!He)return $(1,'[pool] Work received, but pool has not been started.'),r('Pool is not inited but work was posted to it!');try{$(4,'[pool] Acquiring worker'),o=await He.acquire().promise;}catch(e){return r(`[pool] Error when acquiring available entry: ${e}`);}if($(4,'[pool] Acquired worker handle'),!o.page)return r('Resolved worker page is invalid: pool setup is wonky');try{let i=(new Date).getTime();$(4,`[pool] Starting work on pool entry ${o.id}.`);const n=await pe(o.page,e,t);if(n instanceof Error)return'Rasterization timeout'===n.message&&(o.page.close(),o.page=await se()),r(n);He.release(o);const s=(new Date).getTime()-i;return ke+=s,Se=ke/++we,$(4,`[pool] Work completed in ${s} ms.`),{data:n,options:t};}catch(e){r(`Error trying to perform puppeteer export: ${e}.`);}};function _e(){const{min:e,max:t,size:o,available:r,borrowed:i,pending:n,spareResourceCapacity:s}=He;$(4,`[pool] The minimum number of resources allowed by pool: ${e}.`),$(4,`[pool] The maximum number of resources allowed by pool: ${t}.`),$(4,`[pool] The number of all resources in pool (free or in use): ${o}.`),$(4,`[pool] The number of resources that are currently available: ${r}.`),$(4,`[pool] The number of resources that are currently acquired: ${i}.`),$(4,`[pool] The number of callers waiting to acquire a resource: ${n}.`),$(4,`[pool] The number of how many more resources can the pool manage/create: ${s}.`);}var Ae=()=>({min:He.min,max:He.max,size:He.size,available:He.available,borrowed:He.borrowed,pending:He.pending,spareResourceCapacity:He.spareResourceCapacity}),$e=()=>xe,Ie=()=>Te,Pe=()=>Se,Ne=()=>we;const je=process.env.npm_package_version,Ge=new Date;const We={png:'image/png',jpeg:'image/jpeg',gif:'image/gif',pdf:'application/pdf',svg:'image/svg+xml'};let Ue=0;const Fe=[],Me=[],qe=(e,t,o,r)=>{let i=!0;const{id:n,uniqueId:s,type:a,body:l}=r;return e.some((e=>{if(e){let r=e(t,o,n,s,a,l);return void 0!==r&&!0!==r&&(i=r),!0;}})),i;},De=(e,t)=>{(()=>{const e=process.hrtime.bigint();})();const o=de(R),r=e.body,i=++Ue,n=T().replace(/-/g,'');let s=N(r.type);if(!r)return t.status(400).send(P('Body is required. Sending a body? Make sure your Content-type header\n        is correct. Accepted is application/json and multipart/form-data.'));let a=j(r.infile||r.options||r.data);if(!a&&!r.svg)return $(2,P(`Request ${n} from ${e.headers['x-forwarded-for']||e.connection.remoteAddress} was incorrect. Check your payload.`)),t.status(400).send(P('No correct chart data found. Please make sure you are using\n        application/json or multipart/form-data headers, and that the chart\n        data is in the \'infile\', \'options\' or \'data\' attribute if sending\n        JSON or in the \'svg\' if sending SVG.'));let l=!1;if(l=qe(Fe,e,t,{id:i,uniqueId:n,type:s,body:r}),!0!==l)return t.send(l);let c=!1;e.socket.on('close',(()=>{c=!0;})),$(4,`[export] Got an incoming HTTP request ${n}.`),r.constr='string'==typeof r.constr&&r.constr||'chart';const p={export:{instr:a,type:s,constr:r.constr[0].toLowerCase()+r.constr.substr(1),height:r.height,width:r.width,scale:r.scale||o.export.scale,globalOptions:j(r.globalOptions,!0),themeOptions:j(r.themeOptions,!0)},customCode:{allowCodeExecution:ye.getAllowCodeExecution(),allowFileResources:!1,resources:j(r.resources,!0),callback:r.callback,customCode:r.customCode}};a&&(p.export.instr=U(a,p.customCode.allowCodeExecution));const d=W(o,p);if(d.export.options=a,d.payload={svg:r.svg||!1,b64:r.b64||!1,dataOptions:j(r.dataOptions,!0),noDownload:r.noDownload||!1,requestId:n},r.svg&&(u=d.payload.svg,['localhost','(10).(.*).(.*).(.*)','(127).(.*).(.*).(.*)','(172).(1[6-9]|2[0-9]|3[0-1]).(.*).(.*)','(192).(168).(.*).(.*)'].some((e=>u.match(`xlink:href="(?:(http://|https://))?${e}`)))))return t.status(400).send('SVG potentially contain at least one forbidden URL in xlink:href element.');var u;ye.startExport(d,((o,a)=>(e.socket.removeAllListeners('close'),c?$(3,P('[export] The client closed the connection before the chart was done\n          processing.')):a?($(1,P(`[export] Work: ${n} could not be completed, sending:\n          ${a}`)),t.status(400).send(a.message)):o&&o.data?(s=o.options.export.type,qe(Me,e,t,{id:i,body:o.data}),o.data?r.b64?'pdf'===s?t.send(Buffer.from(o.data,'utf8').toString('base64')):t.send(o.data):(t.header('Content-Type',We[s]||'image/png'),r.noDownload||t.attachment(`${e.params.filename||'chart'}.${s||'png'}`),'svg'===s?t.send(o.data):t.send(Buffer.from(o.data,'base64'))):void 0):($(1,P(`[export] Unexpected return from chart generation, please check your\n          data Request: ${n} is ${o.data}.`)),t.status(400).send('Unexpected return from chart generation, please check your data.')))));};const Ve=h();Ve.disable('x-powered-by'),Ve.use(u());const Je=g.memoryStorage(),ze=g({storage:Je,limits:{fieldsSize:'50MB'}});Ve.use(ze.any()),Ve.use(d.json({limit:'50mb'})),Ve.use(d.urlencoded({extended:!0,limit:'50mb'})),Ve.use(d.urlencoded({extended:!1,limit:'50mb'}));const Ke=e=>$(1,`[server] Socket error: ${e}`),Xe=e=>{e.on('clientError',Ke),e.on('error',Ke),e.on('connection',(e=>e.on('error',(e=>Ke(e)))));},Be=async e=>{if(!e.enable)return!1;if(!e.ssl.enable&&!e.ssl.force){const t=m.createServer(Ve);Xe(t),t.listen(e.port,e.host),$(3,`[server] Started HTTP server on ${e.host}:${e.port}.`);}if(e.ssl.enable){let t,o;try{t=await a.readFile(p.join(e.ssl.certPath,'server.key'),'utf8'),o=await a.readFile(p.join(e.ssl.certPath,'server.crt'),'utf8');}catch(t){$(1,`[server] Unable to load key/certificate from ${e.ssl.certPath}.`);}if(t&&o){const t=f.createServer(Ve);Xe(t),t.listen(e.ssl.port,e.host),$(3,`[server] Started HTTPS server on ${e.host}:${e.ssl.port}.`);}}Ve.use(h.static(p.join(I,'public'))),(e=>{!!e&&e.get('/health',((e,t)=>{t.send({status:'OK',bootTime:Ge,uptime:Math.floor(((new Date).getTime()-Ge.getTime())/1e3/60)+' minutes',version:je,highchartsVersion:Z(),averageProcessingTime:Pe(),performedExports:Ne(),failedExports:Ie(),exportAttempts:$e(),sucessRatio:Ne()/$e()*100,pool:Ae()});}));})(Ve),(e=>{e.post('/',De),e.post('/:filename',De);})(Ve),(e=>{!!e&&e.get('/',((e,t)=>{t.sendFile(c(I,'public','index.html'));}));})(Ve),(e=>{!!e&&e.post('/change-hc-version/:newVersion',(async(e,t)=>{const o=process.env.HIGHCHARTS_ADMIN_TOKEN;if(!o||!o.length)return t.send({error:!0,message:'Server not configured to do run-time version changes: HIGHCHARTS_ADMIN_TOKEN not set'});const r=e.get('hc-auth');if(!r||r!==o)return t.send({error:!0,message:'Invalid or missing token: set token in the hc-auth header'});const i=e.params.newVersion;if(i){try{await Y(i);}catch(e){t.send({error:!0,message:e});}t.send({version:Z()});}else t.send({error:!0,message:'No new version supplied'});}));})(Ve),e.rateLimiting&&e.rateLimiting.enable&&![0,NaN].includes(e.rateLimiting.maxRequests)&&q(Ve,e.rateLimiting);};var Ye={start:Be,getExpress:()=>h,getApp:()=>Ve,use:(e,...t)=>{Ve.use(e,...t);},get:(e,...t)=>{Ve.get(e,...t);},post:(e,...t)=>{Ve.post(e,...t);},enableRateLimiting:e=>q(Ve,e)},Qe={server:Ye,log:$,findChartSize:ge,startExport:ye.startExport,startServer:Be,killPool:Le,initPool:async(e={})=>{const t=de(R);var o;return e=await(async e=>{const t=e.customCode&&e.customCode.loadConfig;try{return t&&(e=W(e,JSON.parse(i(t)))),e;}catch(e){$(1,`[config] Unable to load config from the ${t}: ${e}`);}})(W(t,e)),ye.setAllowCodeExecution(e.customCode&&e.customCode.allowCodeExecution),(o=e.logging&&parseInt(e.logging.level))>=0&&o<=A.levelsDesc.length&&(A.level=o),e.logging&&e.logging.dest&&((e,t)=>{if(A={...A,dest:e||A.dest,file:t||A.file,toFile:!0},0===A.dest.length)return $(1,'[logger] File logging init: no path supplied.');A.dest.endsWith('/')||(A.dest+='/');})(e.logging.dest,e.logging.file||'highcharts-export-server.log'),await B(e.highcharts||{version:'latest'}),await Re({pool:e.pool||{initialWorkers:1,maxWorkers:1},puppeteerArgs:e.puppeteer?.args||[]}),ye.setPoolOptions(e),e;}};export{Qe as default};
