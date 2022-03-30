var highexp = {};

(function () {
  highexp.init = function () {
    var options = document.getElementById('options'),
      format = document.getElementById('format'),
      width = document.getElementById('width'),
      scale = document.getElementById('scale'),
      constr = document.getElementById('constr'),
      error = document.getElementById('error'),
      btnPreview = document.getElementById('preview'),
      btnDownload = document.getElementById('download'),
      preview = document.getElementById('preview-container'),
      optionsCM,
      callbackCM,
      cssCM,
      jsCm,
      mime = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/svg+xml': 'xml',
        'application/pdf': 'pdf'
      };
    optionsCM = CodeMirror.fromTextArea(options, {
      lineNumbers: true,
      mode: 'javascript'
    });

    function ajax(url, data, yes, no) {
      var r = new XMLHttpRequest();
      r.open('post', url, true);
      r.setRequestHeader('Content-Type', 'application/json');
      r.onreadystatechange = function () {
        if (r.readyState === 4 && r.status === 200) {
          if (yes) {
            yes(r.responseText);
          }
        } else if (r.readyState === 4) {
          if (no) {
            no(r.status, r.responseText);
          }
        }
      };
      r.send(JSON.stringify(data));
    }

    function toStructure(async) {
      return {
        infile: optionsCM.getValue(),
        width: width.value.length ? width.value : false,
        scale: scale.value.length ? scale.value : false,
        constr: constr.value,
        type: format.value,
        b64: async
      };
    }

    btnPreview.onclick = function () {
      preview.innerHTML =
        '<div class="info">Processing chart, please wait..</div>';

      ajax(
        '/',
        toStructure(true),
        function (data) {
          var embed = document.createElement('embed');
          embed.className = 'box-size';

          if (
            format.value === 'image/png' ||
            format.value === 'image/jpeg' ||
            format.value === 'image/svg+xml'
          ) {
            preview.innerHTML =
              '<img src="data:' + format.value + ';base64,' + data + '"/>';
          } else {
            // if (format.value === 'pdf') {
            preview.innerHTML = '';
            try {
              embed.src = 'data:application/pdf;base64,' + data;
              embed.style.width = '100%';
              embed.style.height = document.body.clientHeight - 280 + 'px';
              preview.appendChild(embed);
            } catch (e) {
              preview.innerHTML = e;
            }
          }
        },
        function (r, txt) {
          if (r == 429) {
            preview.innerHTML =
              '<div class="info">Too many requests - please try again later</div>';
          } else {
            preview.innerHTML =
              '<div class="info">Error when processing chart: ' +
              txt +
              '</div>';
          }
        }
      );
    };

    btnDownload.onclick = function () {
      ajax(
        '/',
        toStructure(true),
        function (data) {
          var l = document.createElement('a');
          l.download = 'chart.' + mime[format.value];
          l.href = 'data:' + format.value + ';base64,' + data;
          document.body.appendChild(l);
          l.click();
          document.body.removeChild(l);
        },
        function () {}
      );
    };
  };
})();
