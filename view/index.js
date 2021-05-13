var selectedModelID;
var modelType;
var loadedTrainFile;
var loadedDetectFile;
var loadedDetectData = {};
var anomalyData = {};
var selectedFeature;
var graph;
var corGraph;

// Check if the browser supports drag&drop ///////////////
var supportsDragnDrop = function () {
    var div = document.createElement('div');
    return (('draggable' in div) || ('ondragstart' in div && 'ondrop' in div)) && 'FormData' in window && 'FileReader' in window;
}();

if (supportsDragnDrop) {
    // dropArea animation when refreshing the page.
    $('.dropArea').addClass('dropAreaRefreshAnimation');
}
else {
    alert("Please enable JavaScript.");
}
/////////////////////////////////////////////////////////

function removeModel(id) {
    if (selectedModelID == id) {
        selectedModelID = undefined;
    }
    $.ajax({
        url: '/api/model?model_id=' + id,
        type: 'DELETE',
        success: () => {
            $("#tr" + id).remove();
            alert("model " + id + " deleted succesfuly.");
        },
        error: () => {
            alert("error in deleting model");
        }
    });
}

function addModel(model) {
    let id = model.model_id;
    $("#modelTableBody").append("\
    <tr id=\"tr" + id + "\">\
    <td><input type=\"radio\" id=\"" + id + "\" name=\"radiobtn\"></td>\
    <td>" + id + "</td>\
    <td id=\"status" + id + "\">" + model.status + "</td>\
    <td><button type=\"button\" id=\"delete" + id + "\" class=\"btn btn-sm btn-danger\">X</button></td>\
    </tr>\
    ");
    $("#" + id).click(() => {
        selectedModelID = id;
    });
    $("#" + id).click();
    $("#delete" + id).click(() => {
        removeModel(id);
    });
}

var table;

function createTable() {

    if(table != undefined)
        table.destroy();
    $("#TableRows").html("");

    let attrs = Object.keys(loadedDetectData);
    if (attrs.length == 0) {
        return;
    }
    let headers = $("#TableHeaders");

    let numRows = loadedDetectData[attrs[0]].length;
    // adds the attribute names as columns
    let s = "<th class=\"thSticky\">timestep</th>\n";
    attrs.forEach(attr => {
        s += "<th class=\"thSticky\">" + attr + "</th>\n";
    });
    headers.html(s);

    table = $('#DetectTable').DataTable( {
        ordering: false,
        searching: false
    });

    for (let i = 0; i < numRows; i++) {
        let curRow = [];
        curRow.push(i);
        attrs.forEach(attr => {
            curRow.push(loadedDetectData[attr][i]);
        });
        table.row.add(curRow);
    }
    
    table.draw();
};

function updateSelections() {
    let s = "";
    let attrs = Object.keys(loadedDetectData);
    attrs.forEach(attr => {
        s += "<option id=\"select-" + attr + "\" value=\"" + attr + "\">" + attr + "</option>\n";
    });
    $("#featuresSelect").html(s);
}

function updateSelectedAnomalies() {
    
    let s = "";
    if (selectedFeature != undefined) {

        let anomalyGraphData = [];

        let corFeature = anomalyData.reason[selectedFeature];
        let selectedData = loadedDetectData[selectedFeature];  
        let i = 0;

        if(corFeature != undefined) {

            $("#anomaliesTable").css('visibility','visible');

            let corAnomalyGraphData = [];
            let corSelectedData = loadedDetectData[corFeature];

            anomalyData.anomalies[selectedFeature].forEach(range => {
                s += "<tr><td>" + range[0] + "</td><td>" + range[1] + "</td></tr>\n";                
                      
                for(; i < range[0]; i++) {
                    anomalyGraphData.push(undefined);
                    corAnomalyGraphData.push(undefined);
                }
                for(; i < range[1]; i++) {
                    anomalyGraphData.push(selectedData[i]);      
                    corAnomalyGraphData.push(corSelectedData[i]);
                }  
            });  

            graph.config.data.datasets.unshift({
                label: 'anomalies',
                backgroundColor: 'rgb(255,0,0)',
                borderColor: 'rgb(255,0,0)',
                data: anomalyGraphData,
                spanGaps: false,
                pointRadius: 0
            });
            graph.update();
            
            corGraph.config.data.datasets.unshift({
                label: 'anomalies',
                backgroundColor: 'rgb(255,0,0)',
                borderColor: 'rgb(255,0,0)',
                data: corAnomalyGraphData,
                spanGaps: false,
                pointRadius: 0
            });
            corGraph.update();            
        } else {
            $("#anomaliesTable").css('visibility','hidden');
        }
    }
    $("#anomaliesRows").html(s);    
}

function updateTableAnomalies() {
    let attrs = Object.keys(loadedDetectData);

    Object.keys(anomalyData.anomalies).forEach(key => {
        let corAttr = anomalyData.reason[key];
        if(corAttr != undefined) {
            let keyindex = attrs.findIndex((attr) => attr == key);
            let corKeyIndex = attrs.findIndex((attr) => attr == corAttr);
            if (anomalyData.anomalies[key].length > 0)
                $("#select-" + key).css("background-color", "#dc3545");
                anomalyData.anomalies[key].forEach(range => {
                for (let i = range[0]; i < range[1]; i++) {
                    $(table.cell(i,keyindex + 1).node()).css("background-color", "#dc3545");
                    $(table.cell(i,corKeyIndex + 1).node()).css("background-color", "#dc3545");
                }
            });
        }
    });
}

async function readFile(file, loadedData) {
    let text = await file.text();
    let data = text.split(/\r\n|\r|\n/);
    let features = data[0].split(",");
    // add features keys to the dictionary with arrays as values.
    features.forEach((attr, i) => {
        if (attr in loadedData)
            attr = features[i] += "2";
        loadedData[attr] = [];
    });
    // add all of the data to the correct feature.
    for (let i = 1; i < data.length; i++) {
        let line = data[i].split(",");
        if (line.length > 1) {
            for (let j = 0; j < line.length; j++) {
                loadedData[features[j]].push(parseFloat(line[j]));
            }
        }
    }
};

$("#regSelect").click(() => {
    modelType = 'regression';
});

$("#hybridSelect").click(() => {
    modelType = 'hybrid';
});

$("#trainBtn").click(() => {
    if (modelType == undefined) {
        alert("no model type selected. Please choose one.");
        return;
    }
    if (loadedTrainFile == undefined) {
        alert("no file loaded. Please upload a CSV file.");
        return;
    }
    let loadedTrainData = {};
    readFile(loadedTrainFile, loadedTrainData).then(() => {

        let body = { train_data: loadedTrainData };

        $.ajax({
            url: '/api/model?model_type=' + modelType,
            type: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            success: (model) => {

                addModel(model);
                alert("model uploaded succesfully");

                let interval;
                interval = setInterval(() => {
                    $.getJSON("/api/model?model_id=" + model.model_id, data => {
                        if (data.status == 'ready') {
                            clearInterval(interval);
                            $("#status" + data.model_id).html("ready");
                        }
                    });
                }, 3000);
            },
            error: () => {
                alert("error in uploading model");
            },
            data: JSON.stringify(body)
        });
    });
    $("#trainFileLabel").html("<strong>Choose a train file</strong><span> or drag it here.</span></label>")
});

$("#detectBtn").click(() => {

    if (selectedModelID == undefined) {
        alert("no models loaded. Please upload a train file.");
        return;
    }
    if ($("#status" + selectedModelID).html() == "pending") {
        alert("selected model is pending. Please wait for it to be ready.");
        return;
    }
    if(loadedDetectFile == undefined) {
        alert("no detection file loaded.");
        return;
    }

    loadedDetectData = {};
    readFile(loadedDetectFile, loadedDetectData).then(() => {

        let body = { predict_data: loadedDetectData };

        selectedFeature = Object.keys(loadedDetectData)[0];
        updateSelections();
        $("#featuresSelect").val(selectedFeature);
        $("#featuresSelect").css('visibility','visible');

        createTable();
        updateGraph();

        $.ajax({
            url: '/api/anomaly?model_id=' + selectedModelID,
            type: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            success: (data) => {
                anomalyData = data;
                updateCorGraph();
                updateTableAnomalies();                
                updateSelectedAnomalies();
                alert("recieved anomaly report.");                        
            },
            error: () => {
                alert("error in uploading detect file.");
            },
            data: JSON.stringify(body)
        });
    });
    $("#detectFileLabel").html("<strong>Choose a detect file</strong><span> or drag it here.</span></label>")
});

$("#featuresSelect").change(() => {
    selectedFeature = $("#featuresSelect").get(0).value;
    updateGraph();    
    updateCorGraph();
    updateSelectedAnomalies();
});

$("#trainFileInput").change((event) => {
    if(event.target.files.length == 0)
        return;
    loadedTrainFile = event.target.files[0];
    // change label to show file name
    $("#trainFileLabel").text(loadedTrainFile.name);
});

$("#detectFileInput").change((event) => {
    if(event.target.files.length == 0)
        return;
    loadedDetectFile = event.target.files[0];
    // change label to show file name
    $("#detectFileLabel").text(loadedDetectFile.name);
});

// fileBox for train dropArea
$("#trainDropArea").on('dragover', (event) => {
    // prevent any unwanted behaviors for the assigned events across browsers.
    event.stopPropagation();
    event.preventDefault();
    // Style the drag-and-drop as a "copy file" operation.
    event.originalEvent.dataTransfer.dropEffect = 'copy';
}).on('dragover dragenter', event => {
    $("#trainDropArea").addClass('is-dragover');
}).on('dragleave dragend drop', () => {
    $("#trainDropArea").removeClass('is-dragover');
}).on('drop', (event) => {
    event.stopPropagation();
    event.preventDefault();
    let file = event.originalEvent.dataTransfer.files[0];
    let fileName = file.name.split(".");
    // check if file is a csv file
    if (fileName[fileName.length - 1] == "csv") {
        loadedTrainFile = file;
        // change label to show file name
        $("#trainFileLabel").text(file.name);
    }
    else {
        alert("Only CSV files are allowed.");
    }
});

// fileBox for detect dropArea
$("#detectDropArea").on('dragover', (event) => {
    event.stopPropagation();
    event.preventDefault();
    // Style the drag-and-drop as a "copy file" operation.
    event.originalEvent.dataTransfer.dropEffect = 'copy';
}).on('dragover dragenter', () => {
    $("#detectDropArea").addClass('is-dragover');
}).on('dragleave dragend drop', () => {
    $("#detectDropArea").removeClass('is-dragover');
}).on('drop', (event) => {
    event.stopPropagation();
    event.preventDefault();
    let file = event.originalEvent.dataTransfer.files[0];
    let fileName = file.name.split(".");
    // check if file is a csv file
    if (fileName[fileName.length - 1] == "csv") {
        loadedDetectFile = file;
        // change label to show file name
        $("#detectFileLabel").text(file.name);
    }
    else {
        alert("Only CSV files are allowed.");
    }
});

$.getJSON("/api/models", data => {
    data.forEach(model => { addModel(model); });
});

var timesteps;


function updateGraph() {

    if(graph != undefined)
        graph.destroy();

    timesteps = [];
    for(let i=0; i<loadedDetectData[selectedFeature].length; i++) {
        timesteps.push(i);
    }

    let data = {   
        data: timesteps,  
        labels: timesteps,
        datasets: [{
            label: selectedFeature,
            backgroundColor: 'rgb(81, 112, 181)',
            borderColor: 'rgb(81, 112, 181)',
            data: loadedDetectData[selectedFeature],
            spanGaps: true,
            pointRadius: 0
        }]
    };

    let miny = Math.min.apply(Math, loadedDetectData[selectedFeature]);
    let maxy = Math.max.apply(Math, loadedDetectData[selectedFeature]);
    if(miny == maxy) {
        maxy += 5;
        miny -= 5;
    }
    
    let config = {
        type: 'line',
        data,
        options: {
            indexAxis: 'x',
            normalized: true, 
            responsive: true,
            maintainAspectRatio: false,
            spanGaps: true,
            scales: {
                x: {
                    type: 'linear',
                    min: 0,
                    max: loadedDetectData[Object.keys(loadedDetectData)[0]].length
                },
                y: {
                    type: 'linear',
                    min: miny,
                    max: maxy
                }
            },
            datasets: {
                line: {
                    pointRadius: 0
                }
            },
            elements: {
                point: {
                    radius: 0
                }
            }
        }
    };
    
    graph = new Chart(document.getElementById('graph'),config);

}



function updateCorGraph() {

    if(corGraph != undefined)
            corGraph.destroy();

    let corFeature = anomalyData.reason[selectedFeature];    

    if(corFeature != undefined) {        

        let data = {   
            data: timesteps,  
            labels: timesteps,
            datasets: [{
                label: corFeature,
                backgroundColor: 'rgb(125, 113, 171)',
                borderColor: 'rgb(125, 113, 171)',
                data: loadedDetectData[corFeature],
                spanGaps: true,
                pointRadius: 0
            }]
        };
    
        let miny = Math.min.apply(Math, loadedDetectData[corFeature]);
        let maxy = Math.max.apply(Math, loadedDetectData[corFeature]);
        if(miny == maxy) {
            miny += 5;
            maxy -= 5;
        }
        
        let config = {
            type: 'line',
            data,
            options: {
                indexAxis: 'x',
                normalized: true, 
                responsive: true,
                maintainAspectRatio: false,
                spanGaps: true,
                scales: {
                    x: {
                        type: 'linear',
                        min: 0,
                        max: loadedDetectData[Object.keys(loadedDetectData)[0]].length
                    },
                    y: {
                        type: 'linear',
                        min: miny,
                        max: maxy
                    }
                },
                datasets: {
                    line: {
                        pointRadius: 0
                    }
                },
                elements: {
                    point: {
                        radius: 0
                    }
                }
            }
        };
        
        corGraph = new Chart(document.getElementById('corGraph'),config);
    }
}
