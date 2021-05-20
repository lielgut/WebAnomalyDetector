var selectedModelID; // currently selected model
var modelType; // currently selected model type
var loadedTrainFile; // name of file loaded into train drop-area
var loadedDetectFile; // name of file loaded into detect drop-area
var loadedDetectData = {}; // data loaded from detect file
var anomalyData = {}; // anomaly data that is recieved
var selectedFeature; // currently selected feature name from list
var table; // the datatable
var graph; // the graph for selected feature
var corGraph; // the graph for the correlative feature

// dropArea animation when loading the page.
$('.dropArea').addClass('dropAreaRefreshAnimation');

// function for removing a model
function removeModel(id) {
    // change selected model if current selection was removed
    if (selectedModelID == id) {
        selectedModelID = undefined;
    }
    // send a HTTP Delete request to the server
    $.ajax({
        url: '/api/model?model_id=' + id,
        type: 'DELETE',
        success: () => {
            // if request was succesful, remove the model from table and notify user
            $("#tr" + id).remove();
            alertify.success("model " + id + " deleted succesfuly.");
        },
        error: () => {
            // notify if the request failed
            alertify.error("error in deleting model");
        }
    });
}

// function for adding a new model
function addModel(model) {    
    let id = model.model_id;
    // append a new model row to the models table
    $("#modelTableBody").append("\
    <tr id=\"tr" + id + "\">\
    <td><input type=\"radio\" id=\"" + id + "\" name=\"radiobtn\"></td>\
    <td>" + id + "</td>\
    <td id=\"status" + id + "\">" + model.status + "</td>\
    <td><button type=\"button\" id=\"delete" + id + "\" class=\"btn btn-sm btn-danger\">X</button></td>\
    </tr>\
    ");
    // add a click event for selecting the radio button for added model
    $("#" + id).click(() => {
        selectedModelID = id;
    });
    // change selection to the new added model
    $("#" + id).click();
    // add event for clicking the delete button 
    $("#delete" + id).click(() => {
        removeModel(id);
    });
}

// function for creating the table
function createTable() {

    // delete previoulsy defined table if it exists
    if (table != undefined)
        table.destroy();
    // clear any previous data in table
    $("#TableRows").html("");

    // gets list of attributes
    let attrs = Object.keys(loadedDetectData);
    if (attrs.length == 0) {
        return;
    }
    // get element of table headers
    let headers = $("#TableHeaders");

    let numRows = loadedDetectData[attrs[0]].length;
    // adds the attribute names as columns
    let s = "<th class=\"thSticky\">timestep</th>\n";
    attrs.forEach(attr => {
        s += "<th class=\"thSticky\">" + attr + "</th>\n";
    });
    // set headers in the html
    headers.html(s);

    // create the data table
    table = $('#DetectTable').DataTable({
        ordering: false,
        searching: false
    });

    // add all rows with data to the table
    for (let i = 0; i < numRows; i++) {
        let curRow = [];
        curRow.push(i);
        attrs.forEach(attr => {
            curRow.push(loadedDetectData[attr][i]);
        });
        table.row.add(curRow);
    }

    // show the updated table
    table.draw();
};

// function for updating the list of selectable features
function updateSelections() {
    let s = "";
    // get list of attributes
    let attrs = Object.keys(loadedDetectData);
    // add each attribute to the list of selectable features
    attrs.forEach(attr => {
        s += "<option id=\"select-" + attr + "\" value=\"" + attr + "\">" + attr + "</option>\n";
    });
    // update html for the select element
    $("#featuresSelect").html(s);
}

// function for updating anomalies for selected feature on anomalies table and on graphs
function updateSelectedAnomalies() {

    let s = "";
    // if a feature was selected
    if (selectedFeature != undefined) {

        // data of the anomaly to be presented on the graph
        let anomalyGraphData = [];

        // get name of feature correlative to currently selected feature
        let corFeature = anomalyData.reason[selectedFeature];
        // get data for currently selected feature
        let selectedData = loadedDetectData[selectedFeature];
        
        // if a correlative feature exists
        if (corFeature != undefined) {

            // if a column for the anomalies table doesn't exist in the html
            if ($("#anomaliesCol").length == 0) {
                // add a new column for the anomalies table to the graphs div
                $("#graphs-row").append("\
                <div class=\"col-lg-2 col-md-12\" id=\"anomaliesCol\">\
                    <table id=\"anomaliesTable\" class=\"table table-hover table-bordered table-sm\">\
                    <thead>\
                        <tr class=\"headers\">\
                        <th>start</th>\
                        <th>end</th>\
                        </tr>\
                    </thead>\
                    <tbody id=\"anomaliesRows\">\
                    </tbody>\
                    </table>\
                </div>\
                ");
            }

            
            // data for the correlative feature
            let corSelectedData = loadedDetectData[corFeature];
            // anomaly data for the correlative feature graph
            let corAnomalyGraphData = [];

            let i = 0;
            // iterate the ranges where anomalies existed for selected feature
            anomalyData.anomalies[selectedFeature].forEach(range => {
                // add the anomaly range to the table
                s += "<tr><td>" + range[0] + "</td><td>" + range[1] + "</td></tr>\n";

                // fill the points that are not in range with undefined so they won't appear on graph
                for (; i < range[0]; i++) {
                    anomalyGraphData.push(undefined);
                    corAnomalyGraphData.push(undefined);
                }
                // fill the points that are in range with the relevant data
                for (; i < range[1]; i++) {
                    anomalyGraphData.push(selectedData[i]);
                    corAnomalyGraphData.push(corSelectedData[i]);
                }
            });

            // draw the anomaly ranges on the graph for selected feature, colored in red
            graph.config.data.datasets.unshift({
                label: 'anomalies',
                backgroundColor: 'rgb(255,0,0)',
                borderColor: 'rgb(255,0,0)',
                data: anomalyGraphData,
                spanGaps: false,
                pointRadius: 0
            });
            graph.update();

            // draw the anomaly ranges on the graph for the correlative feature
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
            // if there is no correlative feature, remove the anomalies column (no anomalies exist)
            $("#anomaliesCol").remove();
        }
    }
    // update the anomalies table html with the anomaly ranges
    $("#anomaliesRows").html(s);
}

// function for highlighting the anomalies in the data table and list of features
function updateTableAnomalies() {
    // get list of attributes
    let attrs = Object.keys(loadedDetectData);

    // iterate the features in the anomalies
    Object.keys(anomalyData.anomalies).forEach(key => {
        // get name of correlative feature
        let corAttr = anomalyData.reason[key];
        // if a correlative feature exists
        if (corAttr != undefined) {
            // find indexes for the feature and its correlative feature in the attributes list
            let keyindex = attrs.findIndex((attr) => attr == key);
            let corKeyIndex = attrs.findIndex((attr) => attr == corAttr);
            // if there are any anomalies
            if (anomalyData.anomalies[key].length > 0)
                // color the feature in the features selection list in red
                $("#select-" + key).css("background-color", "#dc3545");
            // iterate the ranges of anomalies
            anomalyData.anomalies[key].forEach(range => {
                // color all table cells of the anomalies in red
                for (let i = range[0]; i < range[1]; i++) {
                    $(table.cell(i, keyindex + 1).node()).css("background-color", "#dc3545");
                    $(table.cell(i, corKeyIndex + 1).node()).css("background-color", "#dc3545");
                }
            });
        }
    });
}

// function for reading a CSV file into loadedData
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

// events for selecting a model type
$("#regSelect").click(() => {
    modelType = 'regression';
});
$("#hybridSelect").click(() => {
    modelType = 'hybrid';
});

// event for clicking the train button
$("#trainBtn").click(() => {
    // check that a model type was selected
    if (modelType == undefined) {
        alertify.error("no model type selected. Please choose one.");
        return;
    }
    // check that a train file was loaded
    if (loadedTrainFile == undefined) {
        alertify.error("no file loaded. Please upload a CSV file.");
        return;
    }
    let loadedTrainData = {};
    // read the loaded file into loadedTrainData
    readFile(loadedTrainFile, loadedTrainData).then(() => {

        let body = { train_data: loadedTrainData };
        // send a HTTP POST request for uploading a new model
        $.ajax({
            url: '/api/model?model_type=' + modelType,
            type: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            success: (model) => {
                // if request was succesful add the model to the table and notify user
                addModel(model);
                alertify.success("model uploaded succesfully");

                // check each 3 seconds if the model is ready using HTTP GET request
                let interval;
                interval = setInterval(() => {
                    $.getJSON("/api/model?model_id=" + model.model_id, data => {
                        if (data.status == 'ready') {
                            // when the model is ready stop sending GET requests and update status in the table
                            clearInterval(interval);
                            $("#status" + data.model_id).html("ready");
                        }
                    });
                }, 3000);
            },
            error: () => {
                // notify if request failed
                alertify.error("error in uploading model");
            },
            data: JSON.stringify(body)
        });
    });
    // reset label for file upload
    $("#trainFileLabel").html("<strong>Choose a train file</strong><span> or drag it here.</span></label>")
});

// event for clicking the detect button
$("#detectBtn").click(() => {

    // check if a model was selected
    if (selectedModelID == undefined) {
        alertify.error("no model selected. Please upload and select a model.");
        return;
    }
    // check that the selected model isn't still pending
    if ($("#status" + selectedModelID).html() == "pending") {
        alertify.notify("selected model is pending. Please wait for it to be ready.");
        return;
    }
    // check that a detect file is loaded
    if (loadedDetectFile == undefined) {
        alertify.error("no detection file loaded.");
        return;
    }

    loadedDetectData = {};
    // read the data from the detect file to loadedDetectData
    readFile(loadedDetectFile, loadedDetectData).then(() => {

        let body = { predict_data: loadedDetectData };

        // set selected feature to the first attribute from the file
        selectedFeature = Object.keys(loadedDetectData)[0];
        // update the list of selections
        updateSelections();
        // change selection in the html select element
        $("#featuresSelect").val(selectedFeature);
        // make the select element visible
        $("#featuresSelect").css('visibility', 'visible');

        // create the data table for currently loaded data
        createTable();
        // update the graph for the data
        updateGraph();

        // send a HTTP POST request to detect anomalies
        $.ajax({
            url: '/api/anomaly?model_id=' + selectedModelID,
            type: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            success: (data) => {
                // if request was succesful, save the anomalies
                anomalyData = data;
                // update the correlative graph
                updateCorGraph();
                // update the anomalies in the table
                updateTableAnomalies();
                // update anomalies in the graph and anomalies table for selected feature
                updateSelectedAnomalies();
                // notify user the anomalies were recieved
                alertify.success("recieved anomaly report.");
            },
            error: () => {
                // notify if the request failed
                alertify.error("error in uploading detect file.");
            },
            data: JSON.stringify(body)
        });
    });
    // reset the label for file uploading
    $("#detectFileLabel").html("<strong>Choose a detect file</strong><span> or drag it here.</span></label>")
});

// event for feature selection change
$("#featuresSelect").change(() => {
    // set selected feature from the select element
    selectedFeature = $("#featuresSelect").get(0).value;
    // update graph for newly selected feature
    updateGraph();    
    $("#graph-card-body").addClass("scrollable");
    // update graph for correlative feature
    updateCorGraph();
    // update the anomalies on graph and anomalies table
    updateSelectedAnomalies();
});

// event for changing the loaded train file
$("#trainFileInput").change((event) => {    
    if (event.target.files.length == 0)
        return;
    // get name of loaded file
    loadedTrainFile = event.target.files[0];
    // change label to show file name
    $("#trainFileLabel").text(loadedTrainFile.name);
});

// event for changing the loaded detect file
$("#detectFileInput").change((event) => {
    if (event.target.files.length == 0)
        return;
    // get name of loaded file
    loadedDetectFile = event.target.files[0];
    // change label to show file name
    $("#detectFileLabel").text(loadedDetectFile.name);
});

// event for dragging a file over the train drop-area
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
        alertify.error("Only CSV files are allowed.");
    }
});

// event for dragging a file over the detect drop-area
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
        alertify.error("Only CSV files are allowed.");
    }
});

// get the list of all models from the server and add each one to the models table
$.getJSON("/api/models", data => {
    data.forEach(model => { addModel(model); });
});


var timesteps;
// function for updating the graph from loaded data
function updateGraph() {

    // delete any previous graph
    if (graph != undefined)
        graph.destroy();

    timesteps = [];
    // list of timesteps from the file
    for (let i = 0; i < loadedDetectData[selectedFeature].length; i++) {
        timesteps.push(i);
    }

    // data for the graph
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

    // min/max values for the X/Y axes
    let miny = Math.min.apply(Math, loadedDetectData[selectedFeature]);
    let maxy = Math.max.apply(Math, loadedDetectData[selectedFeature]);
    if (miny == maxy) {
        maxy += 5;
        miny -= 5;
    }

    // different configurations for the graph
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

    // update the graph from new configurations
    graph = new Chart(document.getElementById('graph'), config);

}

// function for updating the graph for the correlative feature if it exists
function updateCorGraph() {

    // delete any previous graph
    if (corGraph != undefined)
        corGraph.destroy();

    // get name of correlative feature
    let corFeature = anomalyData.reason[selectedFeature];

    // if a correlative feature exists
    if (corFeature != undefined) {

        // data for the graph
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

        // min/max values for the X/Y axes
        let miny = Math.min.apply(Math, loadedDetectData[corFeature]);
        let maxy = Math.max.apply(Math, loadedDetectData[corFeature]);
        if (miny == maxy) {
            miny += 5;
            maxy -= 5;
        }

        // different configurations for the graph
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

        // update the correlative graph
        corGraph = new Chart(document.getElementById('corGraph'), config);
    }
}
