// Create a require module that isn't available at ES6
// jshint esversion: 6
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Importing required Modules
import simulated from "./simulated-annealing.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Importing Required Packages

const xlsx = require("xlsx");
const multer = require("multer");
const express = require("express");
const bodyParser = require("body-parser");

// Preparing the required Packages

const upload = multer({ dest: "uploads/" });
const app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Handling the get request

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

// Handling the data received through the post request

app.post("/", upload.single("fileInput"), (req, res) => {

    try {

        // Transforming the supp excel file into a json array
        const excelFile = req.file;
        if (excelFile.originalname.slice(excelFile.originalname.length - 5) != '.xlsx') {
            errorHandling();
            return res.end();
        }
        const workbook = xlsx.readFile(excelFile.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);

        var matName = Object.keys(data[0]);
        // Extracting Materials to be processed
        var initTable = [];
        for (let i = 0; i < matName.length; i++) {
            var temp8 = initTable.length;
            for (let j = 1; j < data.length; j++) {
                for (let k = 2; k < Object.keys(data[j]).length; k++) {
                    if (matName[i] == Object.keys(data[j])[k]) {
                        initTable.push(matName[i]);
                        break;
                    } else {
                        continue;
                    }
                }
                if (temp8 == initTable.length) {
                    continue;
                } else {
                    break;
                }
            }
        }
        // receiving the common materials data
        let counter = req.body.numInputs;
        var commonName = [];
        var commonDate = [];
        for (let i = 1; i <= counter; i++) {
            let inputName = "common" + i;
            let dateName = "commonDate" + i;
            commonName.push(req.body[inputName]);
            commonDate.push(req.body[dateName]);
            if (commonName[i - 1] == '' || commonDate[i - 1] == '') {
                errorHandling();
                return res.end();
            }
        }
        for (let i = 0; i < commonName.length; i++) {
            for (let j = 1; j <= commonName.length - i - 1; j++) {
                if (commonName[i] == commonName[i + j] || commonDate[i] == commonDate[i + j]) {
                    errorHandling();
                    return res.end();
                }

            }
        }
        


        const starting = req.body.starting;
        // Creating an array of the dates depending on the starting date and the number of Supp Materials    
        var noOfMaterials = initTable.length;

        const d1 = new Date(starting);
        if (d1.getDay() == 4) {
            errorHandling();
            return res.end();
        }
        var ndates = getDates(d1);

        // Creating the initial order of materials
        var commonIndex = [];
        for (let i = 0; i < commonName.length; i++) {
            var temp1 = initTable.indexOf(commonName[i]);
            var temp2 = ndates.indexOf(commonDate[i]);
            commonIndex.push(temp2);
            swapElements(initTable, temp1, temp2);
        }
        // Getting the cost of the table for the algorithm    
        function getEnergy(tab) {
            let cost = 0;
            for (let i = 1; i < data.length; i++) {
                let arr = Object.keys(data[i]);
                for (let j = 2; j < arr.length - 1; j++) {
                    for (let k = 1; k <= arr.length - j - 1; k++) {
                        let index1 = tab.indexOf(arr[j]);
                        let index2 = tab.indexOf(arr[j + k]);
                        if (Math.abs(index1 - index2) == 1) {
                            cost++;
                        }
                    }
                }
            }
            return cost;
        }
        // Generating alternative orders for the materials randomly to be used by the algorithm.    
        function newState(t) {
            let ranIndex1 = randomNumber(0, initTable.length - 1);
            let ranIndex2 = randomNumber(0, initTable.length - 1);
            for (let i = 0; i < commonIndex.length;) {
                if (ranIndex1 != ranIndex2 && ranIndex1 != commonIndex[i] && ranIndex2 != commonIndex[i]) {
                    i++;

                } else {
                    ranIndex1 = randomNumber(0, initTable.length - 1);
                    ranIndex2 = randomNumber(0, initTable.length - 1);
                    i = 0;
                }
            }
            t = swapElements(t, ranIndex1, ranIndex2);
            return t;
        }
        // Getting the Tempreture which resembles the decreasing rate for the algorithm.     
        function getTemp(prevTemperature) {
            return prevTemperature - 0.001;
        }
        // Generating the final order of the materials.
        var orderedMaterials = simulated({ initialState: initTable, tempMax: 100, tempMin: 0.001, newState: newState, getTemp: getTemp, getEnergy: getEnergy });
        // Matching the materials with their corresponding dates and formulating the final schedule.    
        var finalTable = [];
        for (let i = 0; i < ndates.length; i++) {
            var obj = { Date: ndates[i], Material: orderedMaterials.finstate[i] };
            finalTable.push(obj);
        }
        console.log(orderedMaterials.finstate);
        console.log(orderedMaterials.finEnergy);
        // Required Functions
        //
        function randomNumber(min, max) {
            return Math.floor(Math.random() * (max + 1 - min) + min);
        }
        //
        function swapElements(array, index1, index2) {
            let temp = array[index1];
            array[index1] = array[index2];
            array[index2] = temp;
            return array;
        }
        //
        function getDates(sdate) {
            const date = new Date(sdate);

            let dates = [];
            for (let i = 0; i < noOfMaterials; i++) {
                if (date.getDay() != 4) {
                    dates.push(date.toISOString().split("T")[0]);
                    date.setDate(date.getDate() + 1);
                } else {
                    date.setDate(date.getDate() + 1);
                    dates.push(date.toISOString().split("T")[0]);
                    date.setDate(date.getDate() + 1);
                }
            }
            return dates;
        }

        // Transforming the formulated Schedule into an excel File and send it to the user

        const wroksheet = xlsx.utils.json_to_sheet(finalTable);
        const wrokbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wrokbook, wroksheet, 'Sheet1');
        const excelBuff = xlsx.write(wrokbook, { bookType: 'xlsx', type: 'buffer' });
        res.setHeader('Content-Disposition', 'attachment; filename=schedule.xlsx');
        res.send(excelBuff);
    } catch (error) {
        errorHandling();
        return res.end();
    }
    function errorHandling() {
        res.statusCode = 302;
        res.setHeader('Location', '/empty');
    }

});

app.get('/empty', (req, res) => {
    res.sendFile(__dirname + "/error.html");
});

// Initializing the server
const port = process.env.port;
app.listen(port || 3000, function () {
    console.log("Server started at the specified port");
});