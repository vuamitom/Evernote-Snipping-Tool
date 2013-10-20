var activeTabs = new Array(); //list of tab snipper is opened
var snippets = new Array(); //list of snips 
var informControlScript = false;
var settings = new Store("settings",{
	"title":"Web Snip",
	"tagnames":"snip"			
});

window.onload = function(){
	mylog("starting ... snipper ");
	//sync with evernote state - load notebooks 
	syncState();
};

function registerTab(id){
	mylog("registered tab " + id);
	activeTabs.push(id);
}

//return true if snipper has been opened at the tab once
function isActive(id){
	for(var i= 0 ; i < activeTabs.length ; i++){
		if(activeTabs[i] == id)
			return true;
	
	}
	return false;
}

//add snip to the list of screenshots, hashed by tabId
function addSnip(snip,tabId){
	snippets[tabId] = snip;
}

function captureView(startPoint, endPoint){
	//remove the modal cover
	mylog("In background page: capture View");
	//chrome.tabs.executeScript(null,{code:"removeModal();"},function(){
	
	//capture visible tab - slow it down to give buffer time for removing modal

	chrome.tabs.captureVisibleTab(null, {format:'png'}, function(dataURL){
				
				/*testing purpse */
				var offsetX = (document.scrollLeft)? document.scrollLeft : window.pageXOffset;
				var offsetY = (document.scrollTop)? document.scrollTop: window.pageYOffset;
				mylog ('off x = ' + offsetX + ' off y = ' + offsetY );
				/* end testing purpose*/
				mylog("send image data");
				//get the selected tab and send request to that tab
				chrome.tabs.getSelected(null, function(tab){
					//if user is not authenticated 
					var evernoteBook = null;
					var evernoteUser = null;
					if(localStorage["evernote.isAuthenticated"] == "false"){
						//request for authentication
					}							
					else{
							evernoteBook =  JSON.parse(localStorage["evernote.notebooks"]);
							evernoteUser = JSON.parse(localStorage["evernote.user"]);
					}
					//send evernote notebook list to users
					//send image data to contentscript - to display to user and let user modify
					chrome.tabs.sendRequest(tab.id,{opt:"captureDone",
																	imageData:dataURL,
																	startPoint:startPoint, 
																	endPoint:endPoint, 
																	evernoteBooks:evernoteBook, 
																	evernoteShardId: ((evernoteUser!=null ) ? evernoteUser.shardId : null),
																	defTitle: settings.get("title"), 
																	defTag: settings.get("tagnames"),
																	defNotebook:settings.get("notebook")
																	
																	}, function(response) {
							mylog("image data sent to canvas " + response.result);
					});
					
				});
	});
	
	
	//});
	
}
		
//show notifications upon successfully creating a note		
function showNotification(title , content){	
	var notification = webkitNotifications.createNotification(
		'icon48.png',                      // The image.
		 title,
		 content
	);
	notification.show();
}

//respond to request from content script to crop the page screen. 
//or inject CSS and script
chrome.extension.onRequest.addListener(
	function(request, sender, sendResponse) {
			mylog("Request from extention to " + request.opt);
			if(request.opt == "capture"){
				//when users has specified a snipping area and want to capture it
				if(request.startPoint != undefined && request.endPoint!= undefined){
					captureView(request.startPoint, request.endPoint);
					sendResponse({result:"succeeded"});
				}
				else
					sendResponse({result:"failed"});
			}
			else if(request.opt == "init"){
				mylog("init with flag " + request.flag);
				if(request.flag){
					//use snip right away
					//when necessary js and css has been injected into content page
					snip();
				}
				else{
					//otherwise, insert javascript and css
					loadCSSAndScript();
				}
				sendResponse({result:"done init"});
			}
			
			else if( request.opt == "syncState"){
				syncState();
				informControlScript = true;
				sendResponse({result:"success"});
			}
			
			
			else if(request.opt == 'test'){
				testCapture();
				sendResponse({result:"success"});
			}
			
			else if (request.opt == 'notify'){
				showNotification(request.title, request.content);
			}
			
	
});

//show crop selection when browserAction is clicked
chrome.browserAction.onClicked.addListener(function(tab){
	//sendTestData();			
	 mylog("browser action is clicked");
	 chrome.tabs.executeScript(null,{file:"js/init.js"});
	 
	 //test capture screen
	 
});

function testCapture(){
chrome.tabs.captureVisibleTab(null,{format:'png'}, function(dataUrl){
		chrome.tabs.getSelected(null, function(tab){

					//send image data to contentscript - to display to user and let user modify
					chrome.tabs.sendRequest(tab.id,{opt:"testCapture",imageData:dataUrl}, function(response) {

					});
		});
	 });
}
//inject CSS and js as contentScript	
function loadCSSAndScript(){
//get current tab id by inject script

	mylog("loadCSSAndScript");
	chrome.tabs.getSelected(null, function(tab){
		mylog('load css and javascript at tab ' + tab.id );
	
			mylog("bg: insert CSS and javascript");
		//inject css			
			chrome.tabs.insertCSS(null,{file:'style.css'});
		//inject jquery
			chrome.tabs.executeScript(null, {file:"js/jquery-1.6.2.min.js"},function(){
				//insert snip.js script
				chrome.tabs.executeScript(null, {file:"js/snip.js"}, function(){
					//insert toblob of canvas script if not yet supported
					if (HTMLCanvasElement && !HTMLCanvasElement.prototype.toBlob) {
						mylog("injecting canvas-toBlob.js to content page");
						chrome.tabs.executeScript(null, {file:"js/canvas-toBlob.js"}, function(){
							chrome.tabs.executeScript(null,{ code:"$('<div id=\"snipperFlag\" style=\"display:none\"></div>').appendTo('body');"},function(){
								//activate snip
								registerTab(tab.id);
								snip();
							});	
						});
					}	
					else
					//insert a flag
						chrome.tabs.executeScript(null,{ code:"$('<div id=\"snipperFlag\" style=\"display:none\"></div>').appendTo('body');"},function(){
							//activate snip
							registerTab(tab.id);
							snip();
					});
				});
				
				
			});
		
		
	});

}
function snip() {
	//inject code
	//testCapture();
	mylog("start snipping");
	chrome.tabs.executeScript(null, {code:"startSnipping();"});
	//window.close();
}
function createPartHeader(name){
	return "Content-Disposition: form-data; name=\"" + name + "\"";
}


function mylog(text){
	console.log("background: " + text);
}



/*======================= Evernote sync on start up ======================== */
//capturing the action of evernote clip plugin - load notebook lists
function syncState(){
	$.get("https://www.evernote.com/jclip.action?syncState&_=" + (new Date).getTime(), function(data){
		//save note book to localStorage			
		
		if(data && (data.errors == undefined  || data.errors == null)){
			localStorage["evernote.isAuthenticated"] = "true";
			localStorage["evernote.notebooks"] = JSON.stringify(data.result.notebooks);
			localStorage["evernote.user"] = JSON.stringify(data.result.user);
			
			//save user to localStorage
			//mylog(data.result.user);
            mylog("receipt data " + data.result.user);

			if(informControlScript){ //if informControlScript is set, it is to inform control script to continue its operation after syncState completes
				//inform page script upon successful 
				informControlScript = false;
                mylog("inform tab syncStateDone " + data.result.notebooks);
				chrome.tabs.getSelected(null, function(tab){
					chrome.tabs.sendRequest(tab.id, {opt:"syncStateDone", 
																	evernoteBook: data.result.notebooks, 
																	evernoteShardId:data.result.user.shardId,
																	defTitle: settings.get("title"), 
																	defTag: settings.get("tagnames"),
																	defNotebook:settings.get("notebook")
																	}, function(response){
						
					});
				});
			}
		}
		else{
			//if user is not authenticated yet. 
			if(data.errors[0].errorCode == 3){
				localStorage["evernote.isAuthenticated"] = "false";
			}
		}
	}, "json");
}
