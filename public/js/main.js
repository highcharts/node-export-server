const highexp = {};

(function () {
  highexp.init = function () {
    const previewBtn = document.getElementById('preview');
    const downloadBtn = document.getElementById('download');

    previewBtn.addEventListener('click', function (e) {
      e.preventDefault();

      const options = document.getElementById('options').value,
        jsonData = JSON.stringify({
          infile: options,
          base64: true
        });

      const http = new easyHTTP();

      function easyHTTP() {
        this.http = new XMLHttpRequest();
      }

      // Make an HTTP POST Request
      easyHTTP.prototype.post = function (url, data, callback) {
        this.http.open('POST', url, true);
        this.http.setRequestHeader('Content-type', 'application/json');

        let self = this;
        this.http.onload = function () {
          callback(null, self.http.responseText);
        };

        this.http.send(jsonData);
      };

      const url = window.location.origin;

      // Post
      http.post(url, jsonData, function (err, post) {
        if (err) {
          console.log(err);
        } else {
          const j = JSON.parse(post);
          document.getElementById(
            'preview-container'
          ).innerHTML = `<img src="data:image/png; base64,${j.base64}"/>`;
        }
      });
    });

    downloadBtn.addEventListener('click', (e) => {
      e.preventDefault();

      const options = document.getElementById('options').value;
      const jsonData = JSON.stringify(JSON.parse(options));
      const http = new XMLHttpRequest();

      http.open('POST', url);
      http.setRequestHeader('Content-type', 'application/json');

      http.onreadystatechange = function () {
        if (http.readyState === 4) {
          console.log(http);
          console.log(http.responseText);
        }
      };
      http.send(jsonData);
    });
  };
})();
