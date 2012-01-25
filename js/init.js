/*
* content script injected on start
* determine whether to inject script and css to the page
*/
console.log("init snipper content script");
var flag = document.querySelector("#snipperFlag");
if(flag == null || flag == undefined){
	flag = false;
}
else
	flag = true;
	
chrome.extension.sendRequest({opt:"init",flag:flag}, function(response) {
		console.log("init in target = " + flag);
});