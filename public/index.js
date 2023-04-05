let numInputs = 0;
// Handling the functionality of adding a common material
function addInput(){
    numInputs++;
    const newInput = document.createElement("input");
    newInput.type = "text";
    newInput.id = "entery";
    document.getElementById("input").appendChild(newInput);
    newInput.name = `common${numInputs}`;
    const dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.id = "entery";
    dateInput.name = `commonDate${numInputs}`;
    document.getElementById("input").appendChild(dateInput);
    document.getElementById("numInputs").value = numInputs;
}

