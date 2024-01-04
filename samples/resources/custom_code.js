// eslint-disable-next-line no-undef
Highcharts.setOptions({
  chart: {
    events: {
      render: function () {
        this.renderer
          .image(
            'https://www.highcharts.com/samples/graphics/sun.png',
            100,
            75,
            20,
            20
          )
          .add();
      }
    }
  }
});
