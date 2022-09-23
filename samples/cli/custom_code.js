() => {
  Highcharts.setOptions({
    chart: {
      events: {
        render: function () {
          this.renderer
            .image(
              'https://www.highcharts.com/samples/graphics/sun.png',
              170,
              120,
              20,
              20
            )
            .add();
        }
      }
    }
  });
};
