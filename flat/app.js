
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
var activeLegend = '';

legend.append("rect")
    .attr("width", 150)
    .attr("height", 150)
    .attr("x", width-170)
    .attr("y", height-170)
    ;

var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

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
        return Math.sqrt(d[2]*80)+3+'px';
      } else {
        return 3+'px';
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
          return Math.sqrt(d[2]*80)+8+'px';
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
          if (options.drawSpheres) {
            return Math.sqrt(d[2]*80)+3+'px';
          } else {
            return 3+'px';
          }
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
      // Hide or show the elements
      // console.log('click',this, newOpacity, active)

      // method to show only clicked
      g.selectAll(".pie-graph").style("opacity", 0);
      g.selectAll(".markers").style("opacity", 0);
      g.selectAll(".point-arcs").style("opacity", 0);
      g.select(".pie-graph."+options.name).style("opacity", 1);
      g.select(".markers."+options.name).style("opacity", 1);
      g.select(".point-arcs."+options.name).style("opacity", 1);

      g.selectAll(".pie-graph").style("display", "none");
      g.selectAll(".markers").style("display", "none");
      g.selectAll(".point-arcs").style("display", "none");
      g.select(".pie-graph."+options.name).style("display", "");
      g.select(".markers."+options.name).style("display", "");
      g.select(".point-arcs."+options.name).style("display", "");

      legend.selectAll(".legend").style("fill-opacity", 0.5);
      legend.select(".legend."+options.name).style("fill-opacity", 1);

      activeLegend = options.name; // track which layer is active

      // drawPieGraph();


      // method to toggle one at a time
      // var active     = g.select("."+options.name).style("opacity"), // Determine if current line is visible
      //     newOpacity = [1, 0][active]; // toggle transparency
      // g.select(".markers."+options.name).style("opacity", newOpacity);
      // g.select(".point-arcs."+options.name).style("opacity", newOpacity);
      // if (newOpacity == 0) {
      //   g.select(".markers."+options.name).style("display", "none");
      //   g.select(".point-arcs."+options.name).style("display", "none");
      // } else {
      //   g.select(".markers."+options.name).style("display", "");
      //   g.select(".point-arcs."+options.name).style("display", "");
      // }
      // legend.select(".legend."+options.name).style("fill-opacity", newOpacity+.5);
    })
    .text(options.name)
  ;
}

function drawPieGraph(data,options) {
  var radius = Math.min(width, height) / 5;

  var color = ["","rgba(0,128,0,.3)", "rgba(0,128,0,.2)", "#333333"];

  var arc = d3.arc()
      .outerRadius(radius - 10)
      .innerRadius(0);

  var labelArc = d3.arc()
      .outerRadius(radius - 40)
      .innerRadius(radius - 40);

  var pie = d3.pie()
      .sort(function(a, b) {
        // we sort by grouping and then value
        return d3.ascending(a[3], b[3]) || d3.descending(a[2], b[2]);
      })
      .value(function(d) { return d[2]; });

  // this arc is used for aligning the text labels
  var outerArc = d3.arc()
      .outerRadius(radius * 0.9)
      .innerRadius(radius * 0.9);
  // calculates the angle for the middle of a slice
  function midAngle(d) { return d.startAngle + (d.endAngle - d.startAngle) / 2; }

  var pieSvg = g.append("g")
    .attr("class", options.name + " pie-graph")
    .attr("transform", "translate(" + (width - (width / 5)) + "," + ((height/5)) + ")")
    ;

    var pieArcs = pieSvg.selectAll(".arc")
        .data(pie(data))
      .enter().append("g")
        .attr("class", "arc");

    pieArcs.append("path")
        .attr("d", arc)
        .style("fill", function(d) { return color[d.data[3]]; });


    // label and line method from: https://bl.ocks.org/mbhall88/b2504f8f3e384de4ff2b9dfa60f325e2
    pieArcs.append("text")
        .attr('dy', '.35em')
        .html(function(d) {
            // add "key: value" for given category. Number inside tspan is bolded in stylesheet.
            if (d.data[3] == 3) { // res of world get no direct label
              return '';
            }
            return  d.data[3] + d.data[4] + ': <tspan>' + d.data[2]*10 + '</tspan>';
        })
        .attr('transform', function(d) {

            // effectively computes the centre of the slice.
            // see https://github.com/d3/d3-shape/blob/master/README.md#arc_centroid
            var pos = outerArc.centroid(d);

            // changes the point to be on left or right depending on where label is.
            pos[0] = radius * 0.95 * (midAngle(d) < Math.PI ? 1 : -1);
            return 'translate(' + pos + ')';
        })
        .style('text-anchor', function(d) {
            // if slice centre is on the left, anchor text to start, otherwise anchor to end
            return (midAngle(d)) < Math.PI ? 'start' : 'end';
        });


    // add lines connecting labels to slice. A polyline creates straight lines connecting several points
    pieArcs.append('polyline')
        .attr("fill", "none")
        .attr("stroke", "#000")
        .attr("stroke-width", 0.25)
        .attr('points', function(d) {

            if (d.data[3] == 3) { // res of world get no direct label
              return '';
            }

            // see label transform function for explanations of these three lines.
            var pos = outerArc.centroid(d);
            pos[0] = radius * 0.95 * (midAngle(d) < Math.PI ? 1 : -1);
            return [arc.centroid(d), outerArc.centroid(d), pos]
        });

} // end addPieGraph

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
    if (options.drawPieGraph) {
      drawPieGraph(data,options);
    }
  });
}

// load data sets
loadData('data/publications.json',  {   fill: 'rgba(0,100,100,.3)', name: 'publications', drawSpheres: true, drawPieGraph: true, drawLines: false, order: 5});
loadData('data/grants.json',  {         fill: 'rgba(0,128,0,.3)', name: 'grants', drawSpheres: true, drawPieGraph: true, drawLines: false, order: 4});
loadData('data/industry-partners.json',{fill: 'rgba(0,128,0,.2)', name: 'industry-partners', drawPieGraph: false, drawLines: true, order: 1});
loadData('data/industry-sab.json',{     fill: 'rgba(0,100,100,.2)', name: 'industry-sab', drawPieGraph: false, drawLines: true, order: 2});
loadData('data/collab.json',  {         fill: 'rgba(200,0,0,.2)', name: 'collaboraters', drawPieGraph: false, drawLines: true, order: 3});

// addPieGraph();

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
