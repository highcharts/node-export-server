const highexp = {};

(function () {
  highexp.init = function () {
    const previewBtn = document.getElementById('preview'),
      options = document.getElementById('options').value,
      jsonData = JSON.stringify(JSON.parse(options));

    previewBtn.addEventListener('click', function (e) {
      e.preventDefault();

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

      // Post
      http.post('http://127.0.0.1:7801/', jsonData, function (err, post) {
        if (err) {
          console.log(err);
        } else {
          document.getElementById(
            'preview-container'
          ).innerHTML = `<img src="data:image/png; base64,${post}"/>`;
        }
      });
    });
  };
})();
