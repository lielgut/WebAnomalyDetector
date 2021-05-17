<p align="center">
<img src="view/logo.svg" alt="Logo" height="50">
</p>

![forthebadge](https://img.shields.io/badge/Made%20with-Javascript-yellow)

## About

This is our project for "Advanced Programming 2" course in Bar-Ilan University. Our web app loads data from CSV files, allowing the user to train new models with two types of anomaly detectors, and detect anomalies according to chosen model.
The loaded data can be viewed with a data table and graph, with the anomalies colored, in order for the user to easily find the timesteps at which the anomalies occured.
The app implements a RESTful API, using HTTP requests for interactions with the server.

## Features
- ### Training new models:
  - CSV files can be uploaded for training new models, with two avaliable model types - regression (using linear regression) and hybrid (using both regression and minimum-enclosing-circle algorithm). The server learns the correlated features and additional info, and saves it in a MongoDB database.
  This way the trained models are saved and are avaliable to be used for detecting anomalies with new files.
  The user can choose any trained model from the list, view the model status or delete a model.
- ### Detecting Anomalies:
  - The user can upload CSV files for detecting anomalies according to chosen model. The data from this file will be presented in both the data table and the graph, allowing the user to select a feature to view. The server will return the detected anomalies as time ranges at which anomalies occured. These will be presented in an anomalies table if such exist for selected feature. The features with anomalies will be highlighted in red in the feature selection list, and the anomalies will also be highlighted in the datatable and on the graphs. The graph for the correlated feature will be shown also if one exists.

## Project Files
The project files include the following:
- The <b>View</b> folder includes the html, css and Javascript files for the client-side.
- The <b>Model</b> folder includes JS files with the anomaly detection algorithms. The model.js file is used by the server to learn correlations and detect the anomalies. The code written in these files is based on Dr. Eliahu Khalastchi's C++ code for these algorithms, with several changes made.
- The <b>Controller</b> folder includes the server.js file, made with node.js. Express is used for running the server and implementing the REST API. Mongoose is used for interacting with the MongoDB database.

## Dependencies
- [Node.js](https://nodejs.org/) is required for running the server.
- [MongoDB Community Server](https://www.mongodb.com/try/download/community) is required for creating the database which is hosted locally and used by the server.
- A modern web browser such as [Chrome](https://www.google.com/chrome/), [Firefox](https://www.mozilla.org/en-US/firefox/new/) or [Edge](https://www.microsoft.com/edge) for running the web app.

#### Libraries used:
front-end:
- [Bootstrap](https://getbootstrap.com/) v5.0.0
- [ChartsJS](https://www.chartjs.org/) v2.0
- [AlertifyJS](https://github.com/MohammadYounes/AlertifyJS) v1.13.1
- [jQuery](https://jquery.com/) v3.6.0
- [DataTables](https://datatables.net/) v1.10.24
- [Google Fonts](https://fonts.google.com/)

back-end:
- [Mongoose](https://mongoosejs.com/) v5.12.8
- [Express](http://expressjs.com/) v4.17.1
- [moment](https://www.npmjs.com/package/moment) v2.29.1
- [smallest-enclosing-circle](https://www.npmjs.com/package/smallest-enclosing-circle) v1.0.2

## Installation

Make sure you have Node.js and MongoDB Community Server installed. Clone the project locally on your computer with the following command:
```
git clone https://github.com/lielgut/WebAnomalyDetector.git
```
then inside the project folder use the following command to install required packages:
```
npm install
```

## Running & Usage

<b>Running the server:</b><br>
First run a MongoDB server on your computer, using the following command:
```
mongod
```
then run the server using:
```
cd controller
node server.js
```

<b>Using the app:</b><br>
Enter the following URL in your browser:
```
http://localhost:9876/
```

Drag a CSV file for training a new model, choose the model type and click "train" to upload the new model.
Then drag a CSV file for anomaly detection and click "detect". The data loaded from the file can be viewed in the graph or data table. When the server responds with the anomalies, these will be highlighted. Select a feature from the selection box to view its graph and anomaly ranges if such exist.
The CSV files must have column names in the first row of the file.

## Additional information
- [User stories video]()
