var map;
var directionsService;
var request;
var geocoder;
var data;

google.load('visualization', '1', {packages: ['corechart','bar']});
function drawChart() {
        // Set chart options
        var options = {'title':'Motivation',
            'width':400,'height':300, 'backgroundColor':
            {fill:'transparent' }};
        var chart = new google.visualization.ColumnChart(document.getElementById('chart_div'));
        chart.draw(data, options);
}

function initialize() {
    var center = new google.maps.LatLng(52.229676, 21.012229);
    geocoder = new google.maps.Geocoder();
    //directionsService = new google.maps.DirectionsService(); 
        map = new google.maps.Map(document.getElementById('map_canvas'), {
        center: center,
        zoom: 13,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    });
}
function getColour(value){
    var outcolor = '#000000'; //White
    if (value >= 30){
        outcolor = '#FF0000'; //Blue
    }else if(value >= 10){
        outcolor = '#0000FF'; //Blue
    }else{
        outcolor = '#00FF00'; //Green
    }   
    return outcolor;   	
}

function evaluatePath() {
    var myLatlng = 0;
    var markers = [];
    var contentStrings = [];
    var infowindows = [];
    var totExcitement = [];
    var chart;


    ///geocoding input//
    var pStart = document.getElementById('address0').value;
    var pEnd = document.getElementById('address1').value;
    var alg = document.getElementById('algorythm').value;

    var directionsService = new google.maps.DirectionsService();
    var request = {
        origin: pStart,
        destination: pEnd,
        travelMode: google.maps.DirectionsTravelMode.DRIVING
    };
    var polyline = []; 
    polyline[0]= new google.maps.Polyline({
        path: [],
        strokeColor: '#00FF00',
        strokeWeight: 3,
        map: map
    });
    data = new google.visualization.DataTable();
    data.addColumn('string', 'interval');
    data.addColumn('number', 'Excitement value');
                
    directionsService.route(request, function(result, status) {
        if (status == google.maps.DirectionsStatus.OK) {
            var bounds = new google.maps.LatLngBounds();
            var path = result.routes[0].overview_path;
            var legs = result.routes[0].legs;
            myLatlng = elaborateRoute(map, legs,polyline,
                bounds, markers,
                contentStrings, totExcitement, alg);
            //assign colors to polyline//
            setMultplePolylineColor(polyline, totExcitement);
            //calculate average excitement//
            var ExMark =0;
            for(i=0;i<totExcitement.length;i++){
                ExMark += totExcitement[i];
            }
            ExMark/= totExcitement.length; 
            map.fitBounds(bounds);
            ////legend//
            var legend = document.createElement('div');
            legend.id = 'legend';
            var content = [];
            for(i=0;i<10/*headingArray.length*/;i++){
                content.push('<p><div class="legend"></div>H'+i+'='+totExcitement[i]+'</p>');
                data.addRow(['T'+i, totExcitement[i]]);
                //window.alert("Table Add row= "+data.getValue((data.getNumberOfRows()-1), 2));
            }
            legend.innerHTML = content.join('');
            legend.index = 1;
            map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(legend);

            //inject the final marker
            var markerImage = new
                google.maps.MarkerImage('destIcon.png',
                        new google.maps.Size(50, 51), null,
                        new google.maps.Point(50, 50));
            markers[markers.length]= new google.maps.Marker({
                    position: myLatlng,
                    map: map,
                    title: 'destination',
                    icon: markerImage
                });

            // polyline.setMap(map);
            for (i=0;i<markers.length;i++) {
                infowindows[i] = new google.maps.InfoWindow({
                    content: contentStrings[i]
                });
                google.maps.event.addListener(markers[i], 'click', (function(i) {
                return function(){
                    infowindows[i].open(map,markers[i]);
                }
                })(i));

            }

            //window.alert("Table rows= "+data.getNumberOfRows());
            drawChart();
        } else {
            console.log("direction issue"+status);
        }
    });
}
//function to elaborate the route received//
// in: map, legs, polyline, bounds, algorythm
// out: markers, contentStrings
// return value = final position

function elaborateRoute(map, legs, polyline, bounds,  markers,
        contentStrings, totExcitement, alg){
    if(alg==0) return elaborateDH(map, legs, polyline, bounds,
            markers, contentStrings, totExcitement);
    else if(alg==1) return elaborateNumSections(map, legs,
            polyline, bounds,  markers, contentStrings, totExcitement);
}
function elaborateDH(map, legs, polyline, bounds,  markers, contentStrings, totExcitement){
    /*for (i=0;i<legs.length;i++) {
        var steps = legs[i].steps;
        for (j=0;j<steps.length;j++) {
            var nextSegment = steps[j].path;
            var heading =0;
            var TotsegLenght =0;
            var HeadVar =0;
            var StartPoint = nextSegment[0];
            var prevHeading =256;
            var segLenght =0;

            for (k=0;k<nextSegment.length;k++) {
                if(k>=1) {
                heading = google.maps.geometry.spherical.computeHeading(nextSegment[k-1], nextSegment[k]);
                if(prevHeading!=256){
                    var tempHead = Math.abs(heading-prevHeading);
                    if(tempHead > 180) tempHead = Math.abs(HeadVar-360);
                    HeadVar += tempHead;
                    segLenght = google.maps.geometry.spherical.computeDistanceBetween(nextSegment[k-1], nextSegment[k]);
                }
                TotsegLenght+=segLenght;
                //window.alert("Heading = "+heading+" Lenght ="+segLenght);
                    prevHeading = heading;
                }
                polyline.getPath().push(nextSegment[k]);
                bounds.extend(nextSegment[k]);
                finalPos = nextSegment[k];
            }
            //don't add the final marker
            if(j<steps.length-1) markers[j] = new google.maps.Marker({
                position: finalPos,
                map: map,
            });
            var DHeadN = HeadVar/TotsegLenght * 100;
            contentStrings[j] = '<div id="content">'+
                'Leg '+i+' Segment '+j+' lenght ='+nextSegment.length+' VarHeading = '+HeadVar.toFixed(2)+' TotLenght ='+TotsegLenght.toFixed(2)+' Mark = '+DHeadN.toFixed(2)+'%'+
                '</div>';
        }
    }*/

    var TotsegLenght =0;
    var HeadVar =0;
    var p = 0;
    var prevHeading =256;
    var heading = 0;
    var headingArray = [];
    var prevSegment = 0;	
    var bendsNumb = 0;
    var bendDirection =0;
    var bendDetection =0;
    var myPosition =0;
    for (i=0;i<legs.length;i++) {
        var steps = legs[i].steps;
        for (j=0;j<steps.length;j++) {
            var nextSegment = steps[j].path;                 
            for (k=0;k<nextSegment.length;k++) {
                var segLenght =0;
                if(!((k==0)&&(i==0)&&(j==0))) { 
                    heading = google.maps.geometry.spherical.computeHeading(prevSegment, nextSegment[k]);
                    if(prevHeading!=256){
                        var tempHead = Math.abs(heading-prevHeading);
                        if(tempHead > 180) tempHead = Math.abs(HeadVar-360);
                        headingArray[headingArray.length] = tempHead;
                        HeadVar += tempHead;
                        segLenght = google.maps.geometry.spherical.computeDistanceBetween(prevSegment, nextSegment[k]);
                    } 
                    prevHeading = heading;
                } 
                TotsegLenght+=segLenght;
                prevSegment = nextSegment[k];
                polyline[p].getPath().push(nextSegment[k]);
                bounds.extend(nextSegment[k]);
                myPosition = nextSegment[k];
                //headingArray[headingArray.length] = heading;
        
                if(TotsegLenght>=5000){
                    markers[p] = new google.maps.Marker({
                        position: myPosition,
                        map: map,
                        title: 'T'+p
                    });
                    var DHeadN = HeadVar/TotsegLenght * 100;
                    totExcitement[p]= DHeadN;
                    contentStrings[p] = '<div id="content">'+'Leg '+i+' Segment '+j+' lenght ='+nextSegment.length+' VarHeading = '+HeadVar.toFixed(2)+' TotLenght ='+TotsegLenght.toFixed(2)+' Mark = '+DHeadN.toFixed(2)+'%'+'</div>';
                    
                    p++;
                    HeadVar = 0; //reset counters
                    TotsegLenght = 0;
                    ///create a new polyline////
                    polyline[p]= new google.maps.Polyline({
                    path: [],
                    strokeColor: '#00FF00',
                    strokeWeight: 3,
                    map: map
                    });
                    polyline[p].getPath().push(nextSegment[k]);
                    //init new polyline where the previous ended.
                }
            }
        }
    }
    return myPosition;
}
//function to assign different colors to each part of the
//polyline
// in : polyline
// totExcitement: Values correpondent to each segment of
// polyline
function setMultplePolylineColor(polyline, totExcitement){
    for(i=0; i<polyline.length; i++){
        ////set colour vaue in previous polyline///
        var colour = getColour(totExcitement[i]);
        //alert('This is the new color='+colour);
        polyline[i].setOptions({strokeColor: colour});
    }
}
function elaborateNumSections(map, legs, polyline, bounds,
        markers, contentStrings, totExcitement){
    var finalPos=0;
    var nSections=0;
    var numSegmentsSec=0;
    for (i=0;i<legs.length;i++) {
        var steps = legs[i].steps;
        for (j=0;j<steps.length;j++) {
            var nextSegment = steps[j].path;
            var heading =0;
            var TotSeclength =0;
            var HeadVar =0;
            var StartPoint = nextSegment[0];
            var prevHeading =256;
            var segLenght =0;

            for (k=0;k<nextSegment.length;k++) {
                if(k>=1) segLenght = google.maps.geometry.spherical.computeDistanceBetween(nextSegment[k-1], nextSegment[k]);
                TotSeclength+=segLenght;
                polyline[nSections].getPath().push(nextSegment[k]);
                bounds.extend(nextSegment[k]);
                numSegmentsSec++;
                finalPos = nextSegment[k];
                //don't add the final marker
                if(TotSeclength>= 5000){ 
                    markers[nSections] = new google.maps.Marker({
                    position: finalPos,
                    map: map,
                    });
                    totExcitement[nSections]= numSegmentsSec;
                    contentStrings[nSections] = '<div id="content">'+'Section='+nSections+'TotLenght='+TotSeclength.toFixed(2)+'Mark='+numSegmentsSec+'%'+'</div>';
                    numSegmentsSec = 0; //reset number of segments
                    TotSeclength = 0;
                    nSections++;
                    ///create a new polyline////
                    polyline[nSections]= new google.maps.Polyline({
                        path: [],
                        strokeColor: '#00FF00',
                        strokeWeight: 3,
                        map: map
                    });
                    polyline[nSections].getPath().push(nextSegment[k]);
                    //init new polyline where the previous ended.

                }
            }
            
        }
    }
    return finalPos;
}