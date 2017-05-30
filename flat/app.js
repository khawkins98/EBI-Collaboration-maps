
var svg = d3.select("svg"),
    active = d3.select(null),
    width = window.innerWidth-5,
    height = window.innerHeight-5
    ;

// keep vis fullscreen
svg.attr("width", width).attr("height", height);
window.addEventListener('resize', resize);
function resize() {
  width = window.innerWidth
  height = window.innerHeight;
  svg.attr("width", width).attr("height", height);
  force.size([width, height]).resume();
}



// https://github.com/d3/d3-geo
// https://github.com/d3/d3-geo-projection
var projection = d3.geoGilbert()
        .scale(480)
        // .translate([100,100])
        .center([0,20])
    ;


var path = d3.geoPath()
    .projection(projection);

// https://bl.ocks.org/iamkevinv/0a24e9126cd2fa6b283c6f2d774b69a2
var zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on("zoom", zoomed);

var g = svg.append("g");
svg.on("click", stopped, true);

var legend = svg.append("g")
              .attr("class", "legend");
var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

legend.append("rect")
    .attr("width", 150)
    .attr("height", 150)
    .attr("x", width-170)
    .attr("y", height-170)
    ;

// g.insert("path",":first-child")
//     .attr("id", "graticule")
//     .attr("fill", "none")
//     .attr("stroke", "rgba(100,100,100,.4)")
//     .attr("stroke-width", 0.5)
//     .attr("stroke-opacity", 0.5)
//     .attr("d", path(d3.geoGraticule10()));

g.append("path")
    .attr("fill", "none")
    .attr("stroke", "#000")
    .attr("stroke-width", 0.25)
    .attr("d", path({type: "Sphere"}));

d3.json("world-50m.json", function(error, world) {
  if (error) throw error;

  g.insert("path",":first-child")
      .datum(topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; }))
      .attr("fill", "none")
      .attr("stroke", "rgba(255,255,255,.4)")
      .attr("stroke-width", 0.15)
      .attr("d", path);

  g.insert("path",":first-child")
  // g.insert("path", "#graticule")
      .datum(topojson.feature(world, world.objects.land))
      .attr("fill", "#AAA")
      .attr("d", path)
      .on("click", clicked);


  svg
    .call(zoom); // delete this line to disable free zooming
});

// we have a simple json data string from google sheets,
// so we need to chunk it
function groupData(data) {
  var groupedData = [],
      dataLength = 5;

  for (var i = 0; i <= data.length-dataLength; i = i + dataLength) {
    var tempArray = [];
    for (var x = 0; x < dataLength; x++) { tempArray.push(data[i+x]); }
    groupedData.push(tempArray);
  }
  return groupedData;
}

// expects
// options.fill : color
function addMarkers(data,options) {
  g.append("g")
    .attr("class", options.name + " markers")
    .selectAll("circle")
    .data(data).enter()
    .append("circle")
    .attr("cx", function (d) { return projection([d[1],d[0]])[0]; })
    .attr("cy", function (d) { return projection([d[1],d[0]])[1]; })
    .attr("r", function (d) {
      if (options.drawSpheres) {
        return d[2]*5+3+'px';
      } else {
        return '2px';
      }
    })
    .attr("fill", options.fill)
    .attr("stroke", "rgba(230,230,230,.9)")
    .attr("stroke-width", 0.5)
    .on("mouseover", function(d) {
      d3.select(this).transition()
        .duration("500")
        .attr("stroke-width", 1.5)
        .attr("stroke", "rgba(255,255,255,.9)")
        .attr("r", function(d){
          return d[2]*5+8+'px';
        })
      ;
      // console.log(d,this,options);
      tooltip.transition()
        .duration(200)
        .style("opacity", .9);
      tooltip.html(options.name + "<br/> <span class='label'>" + d[2]*10 + "</span> " + d[4])
        .style("left", (d3.event.pageX) + "px")
        .style("top", (d3.event.pageY - 28) + "px");
      })
    .on("mousemove", function(d) {
      tooltip
        .style("left", (d3.event.pageX) + "px")
        .style("top", (d3.event.pageY - 28) + "px");
      })
    .on("mouseout", function(d) {
      d3.select(this).transition()
        .duration("500")
        .attr("stroke-width", 0.5)
        .attr("stroke", "rgba(230,230,230,.9)")
        .attr("r", function(d){
          return d[2]*5+3+'px';
        })
      ;
      tooltip.transition()
        .duration(500)
        .style("opacity", 0);
      });

  ;
}

function drawLines(data,options) {

  // prepare a new group for lines
  var lineSet = g.append("g").attr("class", options.name+" point-arcs");

  // access the individual data records
  var dataSet = g.append("g")
    .attr("class", options.name+" point-arcs")
    .selectAll("path").data(data).enter().append("path")
        .attr("d", function(d) {
          var numberOfLinesToDraw = d[2]*10;
          for (var i = 0; i < numberOfLinesToDraw; i++) {
            drawLineSet(d[1],d[0],numberOfLinesToDraw);
          }
        })
  ;

  function drawLineSet(lat,long,numberOfLinesToDraw) {
    lineSet.append("path")
      .attr("fill", "none")
      .attr("stroke", options.fill)
      .attr("stroke-width", 0.35)
      .attr("d", function() {
        var variationX = Math.floor(Math.random() * (numberOfLinesToDraw)) / 100;
        var variationY = Math.floor(Math.random() * (numberOfLinesToDraw)) / 100;
        variationX *= Math.floor(Math.random()*2) == 1 ? 1 : -1; // pos/nev
        variationY *= Math.floor(Math.random()*2) == 1 ? 1 : -1;

        return path({type: "LineString", coordinates: [[0.11,52.1], [lat+variationX,long+variationY]]});
      })
  }

}

function addLegend(data, options) {
  var offset = options.order * 20;

  var legendGroup = legend.append("g");
  legendGroup.append("text")
    .attr("x", width-150)
    .attr("y", height - 170 + offset)
    .attr("class", options.name + " legend")
    .style("fill", options.color)
    .on("click", function() {
      var active     = g.select("."+options.name).style("opacity"), // Determine if current line is visible
          newOpacity = [1, 0][active]; // toggle transparency
      // Hide or show the elements
      // console.log('click',this, newOpacity, active)
      g.select(".markers."+options.name).style("opacity", newOpacity);
      g.select(".point-arcs."+options.name).style("opacity", newOpacity);
      if (newOpacity == 0) {
        g.select(".markers."+options.name).style("display", "none");
        g.select(".point-arcs."+options.name).style("display", "none");
      } else {
        g.select(".markers."+options.name).style("display", "");
        g.select(".point-arcs."+options.name).style("display", "");
      }
      legend.select(".legend."+options.name).style("fill-opacity", newOpacity+.5);
    })
    .text(options.name)
  ;
}

// load data
function loadData(url,options) {
  d3.json(url, function(error, data) {
    if (error) throw error;
    data = groupData(data);
    // if (options.drawSpheres) {
      addMarkers(data,options);
    // }
    if (options.drawLines) {
      drawLines(data,options);
    }
    addLegend(data,options);
  });
}

// load data sets
loadData('data/publications.json',  {   fill: 'rgba(0,100,100,.3)', name: 'publications', drawSpheres: true, drawLines: false, order: 5});
loadData('data/grants.json',  {         fill: 'rgba(0,128,0,.3)', name: 'grants', drawSpheres: true, drawLines: false, order: 4});
loadData('data/industry-partners.json',{fill: 'rgba(0,128,0,.2)', name: 'industry-partners', drawLines: true, order: 1});
loadData('data/industry-sab.json',{     fill: 'rgba(0,100,100,.2)', name: 'industry-sab', drawLines: true, order: 2});
loadData('data/collab.json',  {         fill: 'rgba(200,0,0,.2)', name: 'collaboraters', drawLines: true, order: 3});

// map zooming
function clicked(d) {
  if (active.node() === this) return reset();
  active.classed("active", false);
  active = d3.select(this).classed("active", true);

  var bounds = path.bounds(d),
      dx = bounds[1][0] - bounds[0][0],
      dy = bounds[1][1] - bounds[0][1],
      x = (bounds[0][0] + bounds[1][0]) / 2,
      y = (bounds[0][1] + bounds[1][1]) / 2,
      scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height))),
      translate = [width / 2 - scale * x, height / 2 - scale * y];

  svg.transition()
      .duration(750)
      .call( zoom.transform, d3.zoomIdentity.translate(translate[0],translate[1]).scale(scale) );
}

function reset() {
  active.classed("active", false);
  active = d3.select(null);

  svg.transition()
      .duration(750)
      .call( zoom.transform, d3.zoomIdentity );
}


function zoomed() {
  // console.log('zoom',d3.event.transform.k)
  g.style("stroke-width", 1.5 / d3.event.transform.k + "px");
  g.attr("transform", d3.event.transform);
}

// If the drag behavior prevents the default click,
// also stop propagation so we don’t click-to-zoom.
function stopped() {
  if (d3.event.defaultPrevented) d3.event.stopPropagation();
}