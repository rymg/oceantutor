/****************************************************************************
 * Purpos : NPEC Ocean Education GEE Web Apps
 * DataSet : GCOM-C/SGLI L3 Chlorophyll-a
 *
 * Auther : Original algorithm : Eligio Maure
 * Editation : FB R.Yamaguchi
 * Update : 2022-06-10
 * Update : 2022-08-20
 * update : 2022-10-31
 * update : 2022-12-15
 * update : 2024-06-13 data change
 ****************************************************************************/
var lastEdit = '2024-06-13';
/********** SECTION A : Initial map and main panel configuration. **********/
// Target Area definition : Around Japan
var geometry = ee.Geometry.Rectangle([117, 25, 150, 49], null, false);
//var geometry =
    /* color: #d63000 */
    /* locked: true */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
//    ee.Geometry.Polygon(
//        [[[127.95818981052633, 40.02917188150222],
//        [127.95818981052633, 25.742489167817105],
//        [145.50475963474508, 25.742489167817105],
//        [145.50475963474508, 40.02917188150222]]],
//        null, false);

// Add layer to map.
Map.addLayer(geometry);
// Center to the object
Map.centerObject(geometry, 5);

function makeColorBarParams(palette) {
  return {
    bbox: [0, 0, 1, 0.1],
    dimensions: '90x10',
    format: 'png',
    min: 0,
    max: 1,
    palette: palette,
  };
}

//var vis = {min: 0, max: 30, palette: 'navy,blue,aqua'};
var vis = {min: -2, max: 1.5, palette: 'blue, cyan, green, yellow, red'};

// Create the color bar for the legend. 2022-08-20
var colorBar = ui.Thumbnail({
    image: ee.Image.pixelLonLat().select(0),
    params: makeColorBarParams(vis.palette),
    style: {stretch: 'horizontal', margin: '0px 8px', maxHeight: '24px'},
  });

// Create a panel with three numbers for the legend.
var legendLabels = ui.Panel({
    widgets: [
      ui.Label('0.1', {margin: '4px 8px'}),
      ui.Label(
          //((vis.max-vis.min) / 2+vis.min),
          '10',
          {margin: '4px 8px', textAlign: 'center', stretch: 'horizontal'}),
      ui.Label('100', {margin: '4px 8px'})
    ],
    layout: ui.Panel.Layout.flow('horizontal')
  });

var legendTitle = ui.Label({
    value: 'SGLI Chllorophyll-a (mg m^-3)',
    style: {fontWeight: 'bold'}
  });

  // Add the legendPanel to the map. 2022-08-20
var legendPanel = ui.Panel([legendTitle, colorBar, legendLabels]);
legendPanel.style().set('position', 'top-right');
Map.add(legendPanel);

//+++++++++++ Main Panel ++++++++++++++++++++/
// Configure UI controls for Map.
Map.setControlVisibility({fullscreenControl:false});

// Add a title and some explanatory text to the main panel.
var header = ui.Label({
                      value: '日本近海の植物プランクトン変動',
                      style: {fontWeight: 'bold', fontSize: '16px', margin: '10px 8px'}});
var text = ui.Label({value:'この画面では、JAXAの気候変動観測衛星「しきさい」GCOM−C衛星に搭載した多波長光学放射計（SGLI）が捉えた、海表面のクロロフィルa濃度を可視化し、植物プランクトンの変動を調べることができます。(実行ボタンをクリックすると動作し、画面右側の地図上に対象期間の平均画像、実行ボタンの下に対象期間の月平均画像がアニメーションとして表示されます)' ,
                    style:{fontWeight: 'bold',color:'Gray'}});

var version = ui.Label({
                      value: 'バージョン ('+lastEdit+')',
                      style: {fontSize:'12px',color:'Red',margin:'0px 8px'}});

//var text = ui.Label('Fill in Target Term Start and End.' ,{fontWeight: 'bold',color:'Gray'});
//var text = ui.Label(' ' ,{fontWeight: 'bold',color:'Gray'});

var mainPanel = ui.Panel([header, text, version], 'flow', {width:'400px',padding:'8px',border:'5px solid black'});
ui.root.widgets().insert(0,mainPanel);

// Add time filter .
var initial_startDate = ee.Date('2018-01-01');
var initial_endDate = ee.Date('2023-04-29');

// STRAT and END
var filterTime = {
    START_DATE: ui.Textbox({
      placeholder: 'YYYY-MM-DD',
      value: initial_startDate.format('yyyy-MM-dd').getInfo(),
    }),
    END_DATE: ui.Textbox({
      placeholder: 'YYYY-MM-DD',
      value: initial_endDate.format('yyyy-MM-dd').getInfo(),
    }),

  };
var filterTime_panel = ui.Panel({
    widgets: [
      ui.Label('(1) 開始・終了年月日を設定', {fontWeight: 'bold'}),
      ui.Panel([
        ui.Label('開始年月日:'), filterTime.START_DATE
      ], ui.Panel.Layout.flow('horizontal')),
      ui.Panel([
        ui.Label('終了年月日:'), filterTime.END_DATE
      ], ui.Panel.Layout.flow('horizontal')),]});
mainPanel.add(filterTime_panel);
var gif_panel = ui.Panel();
mainPanel.add(gif_panel);

/**** DataSet Definitio\n. ***/
// Load Aqua image collection. These are global L3 images
var getChlor_a = function() {
  var target_startDate = filterTime.START_DATE.getValue();
  var target_endDate = filterTime.END_DATE.getValue();
  var iwpFilter = ee.Filter.stringContains({
  leftField: 'system:index',
  rightValue: 'IWPRQ'
});
  // projects/ee-eutrophication-gee4geo/assets/OCEANDATA/SGLI/JASMES
  //var sgliColl = ee.ImageCollection('projects/ee-eutrophicationwatch/assets/OCEANDATA/L2/GCOMC_SGLI/JASMES')
  var sgliColl = ee.ImageCollection('projects/ee-eutrophicationwatch/assets/OCEANDATA/L2/GCOMC_SGLI/IWPR')
    // Filter by date
    .filterDate(target_startDate, target_endDate)
    // Select RGB Rrs
    .select('chla')
    .filter(iwpFilter)
    // take the log10 of each image
    .map(function (image) {
        return image.log10();
    });
  // Composite VisParams
  var visParams = {
    min: -2,
    max: 1.5,
    palette: 'blue, cyan, green, yellow, red'
  };

  // Define GIF visualization parameters.
  var gifParams = {
    'region': geometry,
    'dimensions': 720,
    'crs': 'EPSG:3857',
    'framesPerSecond': 1
  };

  // add map mean images
  var sglichlor_a = sgliColl.mean().visualize(visParams).clip(geometry);

  Map.addLayer(sglichlor_a);

  // caluclation for gif animation
 var ee_startDate = ee.Date(target_startDate);
 var difMonth = ee.Date(target_endDate).difference(ee_startDate,'month');
 var i_difMonth = ee.Number(difMonth);
 print(i_difMonth);

 var begindate = ee.Date(target_startDate);
 var monthColl = ee.ImageCollection(
     ee.List.sequence(1, i_difMonth).map(
       // 2003-2019
       function (year) {
           // map the time series into monthly means
           var date2 = begindate.advance(year, 'month')
           var date1 = date2.advance(-1, 'month')
           var label = date2.format('YYYY-MM')
           return  sgliColl.filterDate(
                       date1, date2
                   ).mean().visualize(visParams).clip(geometry).set({ label: label });

       }).flatten());

  // annotate
  var annotations = [
      {
          position: 'left',
          offset: '1%',
          margin: '1%',
          property: 'label',
          scale: Map.getScale() * 3
      }
       ];

  var text = require('users/gena/packages:text');
  monthColl = monthColl.map(
        function (image) {
               return text.annotateImage(image, {}, geometry, annotations);
        });
  //var monthColl = ee.ImageCollection(
  //    ee.List.sequence(2019, 2019).map(
        // 2003-2019
  //      function (year) {
            // map the time series into monthly means
  //        return ee.List.sequence(1, 12).map(
  //              function (month) {
                    // Get Month Composite, Jan-Dec
  //                  var date = ee.Date.fromYMD(year, month, 1);
                    // filter month images
  //                  return sgliColl.filterDate(
  //                      date, date.advance(1, 'month')
  //                  ).mean().visualize(visParams).clip(geometry);
  //              });
  //      }).flatten());


  //print(monthColl);
  // var mask = monthCollection.mean().mask();
  // mask = mask.updateMask(mask);

  // Render the GIF animation in the console.
  //print(ui.Thumbnail(monthColl, gifParams));
  mainPanel.remove(gif_panel);
  gif_panel = ui.Panel({
    widgets: [ui.Thumbnail(monthColl, gifParams)]});

  mainPanel.add(gif_panel);

  // Define parameters
  var filmArgs =  {
    dimensions:  720,
    region: geometry,
    crs:  'EPSG:3857',
  };
  // displays the images in a grid
  //print(monthColl.getFilmstripThumbURL(filmArgs));

  Export.video.toDrive({
    collection: monthColl,
    // Name of file.
    description: 'TB-animation',
    // Quality of video.
    dimensions: 720,
    // FPS of video.
    framesPerSecond: 8,
    // Region of export.
    region: geometry
  });
// Check and run the task to get the animation in GDrive.
}

// Function for Apply button.
var getOutput = function () {

  // Remove input commands panel.
  //ui.root.remove(mainPanel);

  // Call functions.
  getChlor_a();

};

/********** SECTION D : Apply button configuration. **********/
// Add apply button.
var applyButton = {
    clickRun: ui.Button({
      label: '実行',
      style: {border: '1px solid black',
              height: '30px',
              width: '100px',
      },
      onClick: getOutput,
  }),
};
var applyButton_panel = ui.Panel({
    widgets:[
      ui.Panel([
        ui.Label('実行ボタンをクリックすると動作します', {fontWeight: 'bold'}),
        applyButton.clickRun,
      ]),
    ]
  });
mainPanel.add(applyButton_panel);
