var svg = d3.select("svg.main"),
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
// var projection = d3.geoTransverseMercator()
//         .scale(180)
//         // .translate([100,100])
//         .center([0,20])
//     ;
var projection = d3.geoGilbert()
        .scale(560)
        .translate([800,500])
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

// var legend = svg.append("g").attr("class", "legend");

var navigation = d3.select(".navigation");

// legend.append("rect")
//     .attr("width", width - width/3)
//     .attr("height", 150)
//     .attr("x", 20)
//     .attr("y", 20)
//     ;

var tooltip = d3.select("body").append("div")
    .attr("class", "tool-tip")
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
      .attr("stroke", "rgba(255,255,255,.9)")
      .attr("stroke-width", 0.15)
      .attr("d", path);

  g.insert("path",":first-child")
  // g.insert("path", "#graticule")
      .datum(topojson.feature(world, world.objects.land))
      .attr("fill", "#CCC")
      .attr("d", path)
      .on("click", clicked);

  svg
    .call(zoom);
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
    .attr("opacity", 0.2)
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
      tooltip.html("<span class='label'>"+options.name + "</span><br/>" + d[4] + ": <span class=''>" + d[2]*10 + "</span> ")
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
      .attr("opacity", 0.2)
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
  var offset = (options.order-1) * 100;

  console.log(options)

  // var legendGroup = legend.append("g")
  //   .attr("class", options.name + " legend")
  // ;

  navigation.append("a")
    // .attr("x", 30 + offset)
    // .attr("y", 100)
    // .style("background-color", options.color)
    .attr("class","button padding-top-medium padding-bottom-medium "+options.name)
    .attr("style", function(){
      if (options.drawLines) {
        // add a line to top for lines
        return "border-top: 5px solid "+options.fill+"; background: none; color: #333"

      }
      return "border-top: 5px solid "+options.fill+"; background:"+options.fill

    })
    .attr("href","#")
    .html(function(d){
      // if (options.name === 'All') {
      //   return 'Show all';
      // }
      return options.humanName + '<div class="slideshow-progress"></div>';
    })
    .on("click", function() {
      // Hide or show the elements
      // console.log('click',this, newOpacity, active)

      var animationSpeed = 600;

      // special case of "all"
      if (options.name === 'All') {
        // method to show only clicked

        if (slideShow.active) {
          d3.select('.button .slideshow-progress').style("width","0");
          d3.select('.button.All').html('Play');
        } else {
        }
        d3.select('.navigation').classed('paused', slideShow.active);
        slideShow.active = !slideShow.active;
        d3.select('.button.All')
          .classed("show-pause", slideShow.active);
        enableSlideShowMode();

        svg.selectAll(".pie-graph").transition().duration(animationSpeed).style("opacity", 1);
        // d3.selectAll(".stack-chart").transition().duration(animationSpeed).style("opacity", 1);
        g.selectAll(".markers").transition().duration(animationSpeed).style("opacity", 1);
        g.selectAll(".point-arcs").transition().duration(animationSpeed).style("opacity", 1);

        svg.selectAll(".pie-graph").style("display", "");
        // d3.selectAll(".stack-chart").style("display", "");
        g.selectAll(".markers").style("display", "");
        g.selectAll(".point-arcs").style("display", "");

        navigation.selectAll("a").style("opacity", 1).classed("active", true).classed("secondary", false);;

      } else {
        // method to show only clicked
        svg.selectAll(".pie-graph:not(."+options.name+")").transition().duration(animationSpeed).style("opacity", 0);
        d3.selectAll(".stack-chart:not(."+options.name+")").transition().duration(animationSpeed).style("opacity", 0);
        g.selectAll(".markers:not(."+options.name+")").transition().duration(animationSpeed).style("opacity", 0);
        g.selectAll(".point-arcs:not(."+options.name+")").transition().duration(animationSpeed).style("opacity", 0);
        svg.select(".pie-graph."+options.name).transition().duration(animationSpeed).style("opacity", 1);
        d3.select(".stack-chart."+options.name).transition().duration(animationSpeed).style("opacity", 1);
        g.select(".markers."+options.name).transition().duration(animationSpeed).style("opacity", 1);
        g.select(".point-arcs."+options.name).transition().duration(animationSpeed).style("opacity", 1);

        svg.selectAll(".pie-graph:not(."+options.name+")").transition().delay(animationSpeed/2).style("display", "none");
        d3.selectAll(".stack-chart:not(."+options.name+")").transition().delay(animationSpeed/2).style("display", "none");
        g.selectAll(".markers:not(."+options.name+")").transition().delay(animationSpeed/2).style("display", "none");
        g.selectAll(".point-arcs:not(."+options.name+")").transition().delay(animationSpeed/2).style("display", "none");
        svg.select(".pie-graph."+options.name).style("display", "");
        d3.select(".stack-chart."+options.name).style("display", "");
        g.select(".markers."+options.name).style("display", "");
        g.select(".point-arcs."+options.name).style("display", "");

        navigation.selectAll("a").style("opacity", 0.6).classed("active", false).classed("secondary", true);
        navigation.select("a."+options.name).style("opacity", 1).classed("active", true).classed("secondary", false);;
      }


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
    // .text(options.name)
  ;
}

function drawStackChart(data,options) {

  // constrcut data
  // we convert our flat data into groupings
  var renderedData = [];
  for (var i = 0; i < data.length; i++) {
    var tempGroup = Math.floor(data[i][3]);
    renderedData[tempGroup] = renderedData[tempGroup] || 0;
    var tempVal = renderedData[tempGroup] + (data[i][2] * 10);
    renderedData[tempGroup] = tempVal;
  }

  // make our cosntructed data
  data = [{"Europe":renderedData[1],"EMBL Only":renderedData[2],"Rest of world":renderedData[3],"Other":renderedData[4]}];
  var key = ["Europe", "EMBL Only", "Rest of world", "Other"];

  var initStackedBarChart = {
  	draw: function(config) {
  		me = this,
  		domEle = config.element,
  		stackKey = config.key,
  		data = config.data,
  		margin = {top: 150, right: 20, bottom: 30, left: 30},
  		// parseDate = d3.timeParse("%m/%Y"),
  		// width = 960 - margin.left - margin.right,
  		// height = 500 - margin.top - margin.bottom,
  		xScale = d3.scaleLinear().rangeRound([0, width]),
  		yScale = d3.scaleBand().rangeRound([height, 0]).padding(0.1),
  		// color = d3.scaleOrdinal(d3.schemeCategory20),
      color = d3.scaleLinear().domain([1,3])
        .interpolate(d3.interpolateHcl)
        .range([d3.rgb(d3.color(options.fill)), d3.rgb('#111')]);
      // color = d3.scaleLinear()
      //   .range(["red", "blue"])
      //   .domain([10,500])
      //   .interpolate(d3.interpolateLab);
  		// xAxis = d3.axisBottom(xScale),
  		// yAxis =  d3.axisLeft(yScale).tickFormat(d3.timeFormat("%b")),
  		stackSvg = d3.select('svg.stack-chart-parent').append("g")
        .attr("class", options.name + " stack-chart")
        .attr("style", "opacity: 0")
				// .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      ;

  		var stack = d3.stack()
  			.keys(stackKey)
  			/*.order(d3.stackOrder)*/
  			.offset(d3.stackOffsetNone);

  		var layers = stack(data);
  			// data.sort(function(a, b) { return b.total - a.total; });
      // yScale.domain(data.map(function(d) { return d[0]; }));
			xScale.domain([0, 2200]).nice();

  		var layer = stackSvg.selectAll(".layer")
  			.data(layers)
  			.enter().append("g")
  			.attr("class", "layer")
  			.style("fill", function(d, i) { return color(i); })
        // .style("fill", options.fill)
        ;

  		  layer.selectAll("rect")
  			  .data(function(d) { return d; })
  			.enter().append("rect")
          // .attr("y", function(d) { return yScale(parseDate(d.data.date)); })
          .attr("y", function(d) { return yScale(10); })
  			  .attr("x", function(d) { return xScale(d[0]); })
          .attr("height", 20)
          // .attr("height", yScale.bandwidth())
          // .attr("width", function(d) { return xScale(d[0]) });
          .attr("width", function(d) {
            return xScale(d[1]-d[0])
          })
          .style("stroke", "#fff")
          ;

        layer.append("text")
          .attr('dy', function(d) {
            return '2.5rem';
          })
          .attr('dx', function(d) {
            // special positioning for labels on grans
            if (options.name == 'grants' && d['key'] == 'EMBL Only') {
              return xScale(d[0][0]) - 80;
            }
            return xScale(d[0][0])
          })
          .html(function(d) {
            if (d[0]['data'][d['key']] > 0) {
              return d['key'] +": " + d[0]['data'][d['key']];
            }
          })
        ;

  			// stackSvg.append("g")
  			// .attr("class", "axis axis--x")
  			// .attr("transform", "translate(0," + (height+5) + ")")
  			// .call(xAxis);
        //
  			// stackSvg.append("g")
  			// .attr("class", "axis axis--y")
  			// .attr("transform", "translate(0,0)")
  			// .call(yAxis);
  	}
  }
  initStackedBarChart.draw({
  	data: data,
  	key: key,
  	element: 'stacked-bar'
  });

}

function drawPieGraph(data,options) {
  var radius = Math.min(width, height) / 6;

  var color = ["","rgba(0,128,0,.3)", "rgba(0,128,0,.2)", "#333333"];

  var arc = d3.arc()
      .outerRadius(radius - 22)
      .innerRadius(0);

  var labelArc = d3.arc()
      .outerRadius(radius - 20)
      .innerRadius(radius - 20);

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

  var pieSvg = svg.append("g")
    .attr("class", options.name + " pie-graph")
    .attr("transform", "translate(" + ((width / 5)) + "," + (height-(height/5)) + ")")
    ;

    var pieArcs = pieSvg.selectAll(".arc")
        .data(pie(data))
      .enter().append("g")
        .attr("class", "arc");

    pieArcs.append("path")
        .attr("d", arc)
        .style("stroke-width", "0.25")
        .style("fill", function(d) { return color[d.data[3]]; })
        ;


    // label and line method from: https://bl.ocks.org/mbhall88/b2504f8f3e384de4ff2b9dfa60f325e2
    pieArcs.append("text")
        .attr('dy', '.35em')
        .html(function(d) {
            // add "key: value" for given category. Number inside tspan is bolded in stylesheet.
            // if (d.data[3] == 3) { // res of world get no direct label
            //   return '';
            // }
            if (d.data[2]*10 <= 3) { // no label for small values
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

            // if (d.data[3] == 3) { // res of world get no direct label
            //   return '';
            // }

            if (d.data[2]*10 <= 3) { // no label for small values
              return '';
            }

            // see label transform function for explanations of these three lines.
            var pos = outerArc.centroid(d);
            pos[0] = radius * 0.95 * (midAngle(d) < Math.PI ? 1 : -1);
            return [labelArc.centroid(d), outerArc.centroid(d), pos]
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
    if (options.drawPieGraph) {
      drawPieGraph(data,options);
    }
    if (options.drawStackChart) {
      drawStackChart(data,options);
    }
    addLegend(data,options);
  });
}

// load data sets
loadData('data/publications.json', {
          fill: 'rgb(0,100,100)',
          name: 'publications',
          humanName: 'Joint Publications',
          drawSpheres: true, drawStackChart: true, drawLines: false, order: 5});
loadData('data/grants.json', {
          fill: 'rgb(0,128,0)',
          name: 'grants',
          humanName: 'Joint Grant Funding',
          drawSpheres: true, drawStackChart: true, drawLines: false, order: 4});
loadData('data/industry-partners.json', {
          fill: 'rgb(0,100,100)',
          name: 'industry-partners',
          humanName: 'Industry Programme members',
          drawPieGraph: false, drawLines: true, order: 1});
loadData('data/industry-sab.json', {
          fill: 'rgb(0,128,0)',
          name: 'industry-sab',
          humanName: 'Scientific Advisory Committees',
          drawPieGraph: false, drawLines: true, order: 2});
loadData('data/collab.json', {
          fill: 'rgb(200,0,0)',
          name: 'collaboraters',
          humanName: 'Major Database Collaborations',
          drawPieGraph: false, drawLines: true, order: 3});

// create the "all" button
addLegend('',{ fill: 'rgb(100,100,100)', name: 'All', order: 0})




var slideShow = {
  active: true,
  speed: 7000,
  current: -1,
  slides: ["publications", "grants", "industry-partners", "industry-sab", "collaboraters"]
};

function enableSlideShowMode() {
  if (slideShow.active) {
    if (slideShow.current < slideShow.slides.length - 1) {
      slideShow.current++
    } else {
      slideShow.current = 0;
    }
    d3.select('.button.'+slideShow.slides[slideShow.current]).dispatch('click');
    // d3.selectAll('.button:after').style("background-color","rgba(0,0,0,0)");
    d3.selectAll('.button .slideshow-progress').style("width","0%");
    d3.select('.button.'+slideShow.slides[slideShow.current]+' .slideshow-progress').transition().duration(slideShow.speed-200).style("width", "100%")
    ;

    // set the all button to slideShow mode
    d3.select('.button.All').html('Stop')
      .classed("show-pause", true);
    // keep the slideshow going
    setTimeout(function () { enableSlideShowMode(); }, slideShow.speed);
  }
}

setTimeout(function () { enableSlideShowMode(); }, 500);

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
