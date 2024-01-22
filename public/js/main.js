/* eslint-disable no-undef */
const highexp = {};

(function () {
  highexp.init = function () {
    const options = document.getElementById('options');
    const format = document.getElementById('format');
    const width = document.getElementById('width');
    const scale = document.getElementById('scale');
    const constr = document.getElementById('constr');
    const btnPreview = document.getElementById('preview');
    const btnDownload = document.getElementById('download');
    const preview = document.getElementById('preview-container');

    const mime = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/svg+xml': 'xml',
      'application/pdf': 'pdf'
    };

    const optionsCM = CodeMirror.fromTextArea(options, {
      lineNumbers: true,
      mode: 'javascript'
    });

    function ajax(url, data, yes, no) {
      const r = new XMLHttpRequest();
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

    function toStructure(b64) {
      return {
        infile: optionsCM.getValue(),
        width: width.value.length ? width.value : false,
        scale: scale.value.length ? scale.value : false,
        constr: constr.value,
        type: format.value,
        b64
      };
    }

    btnPreview.onclick = function () {
      preview.innerHTML =
        '<div class="info">Processing chart, please wait...</div>';

      ajax(
        '/',
        toStructure(true),
        function (data) {
          const embed = document.createElement('embed');
          embed.className = 'box-size';

          if (format.value === 'image/png' || format.value === 'image/jpeg') {
            preview.innerHTML =
              '<img src="data:' + format.value + ';base64,' + data + '"/>';
          } else if (format.value === 'image/svg+xml') {
            preview.innerHTML =
              '<img src="data:image/svg+xml;base64,' + data + '"/>';
          } else if (format.value === 'application/pdf') {
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
          const l = document.createElement('a');
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
