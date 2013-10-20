
debugger; 
//this piece of code need to be called once only
var modalSize; //size of the modalwindow
var cvs;
var body = $('body');
var shardId; //evernote server shard id
var defaultSettings = {content:""};
//simulate the XMLHttpRequest.sendAsBinary
if (XMLHttpRequest.prototype.sendAsBinary === undefined) {
  	XMLHttpRequest.prototype.sendAsBinary = function(string) {
	var bytes = Array.prototype.map.call(string, function(c) {
			      return c.charCodeAt(0) & 0xff;
    	});
	this.send(new Uint8Array(bytes).buffer);
  };
}
//all necessary step to setup a page
function startSnipping(){
	var exist = $('#viewPatch'); //check if modal already shown 
	if(!exist || exist.length == 0){

	    modalSize = {width:window.innerWidth+50, height:(window.innerHeight+200)};
		//create a modal window 
		//body.css('overflow','hidden');
		//console.log("width='"+window.innerWidth+"' height='"+window.innerHeight);

		var modalW =  $("<div class='modal'><canvas id='viewPatch' width='"+modalSize.width+"' height='"+ modalSize.height+"'></canvas></div>")
		modalW.prependTo(body);
		var offsetX = (document.scrollLeft)? document.scrollLeft : window.pageXOffset;
		var offsetY = (document.scrollTop)? document.scrollTop: window.pageYOffset;
		modalW.css({'top':offsetY+'px','left':offsetX+'px'});
		
		//prevent page scrolling
		
		window.onscroll = function(){
			//window.scrollTo(0,0);
			
			var modalW = $('.modal');		
			var offsetX = (document.scrollLeft)? document.scrollLeft : window.pageXOffset;
			var offsetY = (document.scrollTop)? document.scrollTop: window.pageYOffset;
			modalW.css({'top':offsetY+'px','left':offsetX+'px'});
			
		}

		//detect keypress for shortcut command
		document.onkeyup = function(){
			keyUpHandler(event);
		}

		//init canvas, add listeners
		cvs = document.getElementById('viewPatch');
		cvs.onmousedown = function(){
			modalPressed(this,event);	
		};

		cvs.onmousemove = function(){
			modalMoved(this,event);
		};
		cvs.onmouseup = function(){
			modalReleased(this,event);
		};
		modalize(cvs);
	}
}


//select view area

//capture picture
var isDrag = false;
var clickPos = null;
var endPos = null;

/*supporting functions*/
//handle mouse click

function modalize(cvs){
	var ctx = cvs.getContext('2d');
	ctx.fillStyle="rgba(204,204,204,0.5)";
	ctx.fillRect(0,0,modalSize.width,modalSize.height);	
}

function modalPressed(cvs,event){
	isDrag = true;
	clickPos = {x:event.offsetX,y:event.offsetY};
	console.log(clickPos);
}

//handle mouse press and drag
function modalMoved(cvs,event){
	//console.log(event.layerY);
	if(isDrag){
		//draw selection area
		var ctx = cvs.getContext('2d');
		resetContext(ctx);
		ctx.clearRect(clickPos.x,clickPos.y,event.offsetX-clickPos.x,event.offsetY-clickPos.y);		
		ctx.strokeStyle = '#000';
		ctx.beginPath();
		ctx.moveTo(clickPos.x, clickPos.y);
		ctx.lineTo(clickPos.x, event.offsetY);
		ctx.lineTo(event.offsetX, event.offsetY);
		ctx.lineTo(event.offsetX,clickPos.y);
		ctx.lineTo(clickPos.x,clickPos.y);		
		ctx.stroke();
		ctx.closePath();

	}
}
//handle mouse up
function modalReleased(cvs,event){
	isDrag = false;
	endPos  = {x:event.offsetX, y:event.offsetY};
	//take snapshot
}

function takeSnapshot(){
	chrome.extension.sendRequest({opt:"capture",startPoint: clickPos, endPoint:endPos}, function(response) {
		console.log("END REQUET");
  		//console.log(response.farewell);
	});
	
}

function resetContext(ctx){
	ctx.clearRect(0,0,modalSize.width, modalSize.height);
	ctx.fillStyle = "rgba(204,204,204,0.5)";
	ctx.fillRect(0,0,modalSize.width, modalSize.height);	
}

function removeModal(){
		//body.css('overflow','auto');
		//window.onscroll = null;
		$('.modal').remove();
}

function onexit(){

	//body.css('overflow','auto');
	window.onscroll = null;
	stopProcessRunner();
	//remove modal
	$('.modal').remove();
	$('#popup').remove();
}
//handle keypress on modal window
function keyUpHandler(event){
	var code =event.keyCode? event.keyCode:event.which;
	
	//console.log('key code = ' + code);
	switch(code){
		case 13: //press ENTER
        var popup = document.getElementById('popup');
        var modal = $('.modal');
        if(!popup && modal && modal.length > 0){
		    removeModal();
		    setTimeout('takeSnapshot()',200); //buffer time to clean up screen;
        }
		break;
		case 27://press ESC
		onexit();
		break;
	}
		
}

function hidePopUp(){

	$('#popup').css('display','none');
}

function showPopUp(){

	$('#popup').css('display','block');
}

/*
========== COMMUNICATE WITH BACKGROUND PAGE ======
*/

var processRunnerSize = {width:80, height:10, units: 8};
var draw = false;
var evernoteBooks ;
chrome.extension.onRequest.addListener(
	function(request, sender, sendResponse) {
		
		//create pop up
        console.log("background request : " + request.opt);
		if(request.opt == "captureDone"){
		
			var srcX = (request.startPoint.x  < request.endPoint.x)? request.startPoint.x : request.endPoint.x; srcX++; // -1 to account for the border
			var srcY = (request.startPoint.y < request.endPoint.y)? request.startPoint.y : request.endPoint.y; srcY++;

			var size = sizingPopup(request.startPoint, request.endPoint);

			var newPopup = $('<div id="popup" ><div id="snipControl"><div><div>Snip<div id="closeBut" title="close (or press ESC)">X</div></div></div>\
										 <div><div id="cvsContainer" style="width:' + size.cvsContainerW + 'px; height:' + size.cvsContainerH + 'px; ">\
										 <canvas id="snipCvs" width="' + size.cvsW + '" height="'+ size.cvsH +'" style="margin-left:' + size.cvsContainerPaddingLeft +'px;margin-top:' + size.cvsContainerPaddingTop + 'px"></canvas></div>\
										 <div id="controlBar"><button id="evernoteBut">Evernote</button></div>\
										 <div id="statusBar"><span ></span><canvas id="processRunner" width="' + processRunnerSize.width+'" height="'+ processRunnerSize.height+'"></canvas></div></div></div></div>').appendTo('body');		
            addListenerToEvernoteBut();
			//addListenerToEditBut();
			//adjust pop up size
			var popup = $('#snipControl');
			popup.css('width',size.popupW+'px');
			popup.css('height',size.popupH + 'px');
			
			centerPopup(popup, size.popupW, size.popupH);
			//create an image
			var img = new Image();
			img.src = request.imageData;
			console.log("got bg request");
			img.onload = function(){
				//sizing image based on 			
				ctx.drawImage(img, srcX, srcY, size.cvsW, size.cvsH, 0, 0,size.cvsW, size.cvsH );
				//ctx.drawImage(img,0,0);
				console.log("Drawn Image");
			}		
		

			//add image to the canvas
			//create canvas size based on the crop size
			var controlCvs = document.getElementById("snipCvs");
			var ctx = controlCvs.getContext("2d");
			//enable drawing on picture
			controlCvs.onmousedown = function(){
				ctx.beginPath();
				ctx.moveTo(event.offsetX, event.offsetY);
				ctx.strokeStyle = "red";
				draw = true;
			}
			
			controlCvs.onmousemove = function(){
				if(draw){
				ctx.lineTo(event.offsetX,event.offsetY);
				ctx.stroke();
				}
			}
			
			controlCvs.onmouseup = function(){
				ctx.closePath();
				draw = false;
			}
			
		
			if(request.evernoteBooks !=null ) {
				evernoteBooks = request.evernoteBooks;
				shardId = request.evernoteShardId;
				defaultSettings.title = (request.defTitle!=null)? request.defTitle: "Web Snip";
				defaultSettings.tagnames = (request.defTag!=null)? request.defTag:"snip";
				defaultSettings.notebook = request.defNotebook;
				displayNotebookLists();
	
			}
			
			//init process runner
			initProcessRunner();
			//add listener to close but
			
			var closeBut = document.getElementById('closeBut');
			closeBut.onclick  = onexit;
			
		}

		else if(request.opt == "syncStateDone"){
			// authentication complete - stop loading screen. 
            console.log("Sync state done .... " + request.evernoteBook);
			if(request.evernoteBook!=null && request.evernoteBook!= undefined){
				evernoteBooks = request.evernoteBook;
				shardId = request.evernoteShardId;
				defaultSettings.title = (request.defTitle!=null)? request.defTitle: "Web Snip";
				defaultSettings.tagnames = (request.defTag!=null)? request.defTag:"snip";
				defaultSettings.notebook = request.defNotebook;
				displayNotebookLists();
				//addToEvernote();
			}
			//remove auth form
			$('#authForm:parent').remove();
			//shorten popup window
			$("#snipControl").css('height', parseInt($('#snipControl').css('height'))  - 70 + 'px');
 			document.getElementById('evernoteBut').disabled = false; //re-enable evernote but
		}
		else if(request.opt == 'testCapture'){
			var img = new Image();
			img.src= request.imageData;
		}
        updateUI();
		sendResponse({result:'success'});
	});
function sizingPopup(cvsStartPoint, cvsEndPoint){
	
	var size = {};
	size.cvsW = Math.abs(cvsStartPoint.x-cvsEndPoint.x)-1;
	size.cvsH = Math.abs(cvsStartPoint.y-cvsEndPoint.y)-1;
	
	size.popupW = size.cvsW + 20;
	size.popupW = (size.popupW >= 300)? size.popupW: 300;
	size.cvsContainerW = size.popupW;
	
	size.popupH = size.cvsH+85;
	size.popupH = (size.popupH  >= 200 )? size.popupH : 200;
	size.cvsContainerH =  size.popupH - 75;
	
	size.cvsContainerPaddingLeft = parseInt((size.cvsContainerW - size.cvsW)/2);
	size.cvsContainerPaddingTop = parseInt((size.cvsContainerH - size.cvsH)/2);
	return size;
}

//center pop up	
function centerPopup(jQueryPopup, popupW, popupH){
	//account for scroll 
	var offsetX = (document.scrollLeft)? document.scrollLeft : window.pageXOffset;
	var offsetY = (document.scrollTop)? document.scrollTop: window.pageYOffset;
	
	jQueryPopup.css('left', offsetX + (window.innerWidth - popupW)/2  + 'px');
	jQueryPopup.css('top', offsetY + (window.innerHeight - popupH)/2 + 'px');
	
}	

function displayNotebookLists(){
	var test = document.querySelector('select[class=notebooksList]');
	if(test!=null){
		$(test).remove();
	}
	var select = $('<select class="notebooksList"></select>');
	
	if(defaultSettings.notebook == null)
		defaultSettings.notebook = evernoteBooks[0].guid;
		
	for(var book in evernoteBooks){
		if(evernoteBooks[book].guid == defaultSettings.notebook)
			select.append('<option value="' + evernoteBooks[book].guid + '" selected="selected">' + evernoteBooks[book].name + '</option>');		
		else
			select.append('<option value="' + evernoteBooks[book].guid + '" >' + evernoteBooks[book].name + '</option>');	
	}
	select.change(function(){
		defaultSettings.notebook = this.options[this.selectedIndex].value;
	});
	select.insertAfter('#evernoteBut');
	
}
/*
 * =============HANDLING HTTP ======================
 */	
//read in key-value pairs, return request payload
function createMultiPartPayload(dataMap, boundary){
		var crlf = "\r\n";
		boundary = "--" + boundary; //"------WebKitFormBoundaryT0vQ8QqXc13eTJpa";// dash boundary = '--' + declaredInHeaderBoundary 
		var data = "";
	    for ( var key in dataMap){
			data+= crlf + boundary + crlf + "Content-Disposition: form-data; name=\"" + key + "\"" + crlf + crlf + dataMap[key];
		}
		//CRLF epilogue
		data += crlf + boundary + "--" + crlf ;
		return data;
}


function generateBoundary() {
	return "----WebKitFormBoundary" + (new Date).getTime();
}		
/*
* ========= EVERNOTE===============================
*/
var loginUrl = "https://www.evernote.com/jclip.action?login";
var hidePopUpTimer = null;

function addToEvernote(){
	console.log("add data to evernote");

	//check if the user is authenticated
	if(evernoteBooks !=null ){
			
			//disable button 
			document.getElementById('evernoteBut').disabled = true;
			//var imgData;
			var controlCvs = document.getElementById("snipCvs");
			//console.log("snip.js " + HTMLCanvasElement.prototype.toBlob);
			var processBlob = function(blob){
						//myBlob = blob;
						//save to file 
						console.log("snip.js " + "converting to blob");
						
						var fr = new FileReader();
						fr.onloadend = function(evt){
							
							if(evt.target.readyState == FileReader.DONE){			
								setStatus('Uploading Image');
								startProcessRunner();
								attachImageUsingNativeXHR(evt.target.result, "snipper" + (new Date).getTime(),"image/png");
								defaultSettings.tagnames = $('input[name="tagnames"]').val();
        						defaultSettings.title = $('input[name="title"]').val();
        						defaultSettings.comment =$('input[name="comment"]').val();
								hidePopUpTimer = setTimeout('hidePopUp()',800); //hide popup to avoid obscure user's view
							}
						}			
						fr.readAsBinaryString(blob);
		
					};
					

			if(HTMLCanvasElement.prototype.toBlob){
				controlCvs.toBlob(processBlob,"image/png");
					
			}
			else if(getBlobFromCanvas){
				console.log("getblobfromcanvas = " + getBlobFromCanvas);
				getBlobFromCanvas(controlCvs, processBlob,"image/png");
			}
			//controlCvs.toBlob(); //in chrome extension, since HTMLCanvasElement prototype is modified by content script 
			//in a separate execution context, which is not effective on an element of the page
			
	}
	else{
		var hasForm = document.getElementById('authForm');	
        if(!hasForm)
		    addAuthForm();
	}	
}

function addAuthForm(){
	//display authentication window
			console.log("authenticate evernote user");			
			var snipControl = document.querySelector("#snipControl");
			snipControl.addEventListener("webkitTransitionEnd", showAuthFormHandler, false);
			$("#snipControl").css('height', parseInt($('#snipControl').css('height'))  + 70 + 'px');
}

function showAuthFormHandler(){
	//mozilla uses transitionend instead
	this.removeEventListener("webkitTransitionEnd", showAuthFormHandler, false);
	//var parent = $("#snipControl > div:nth-child(2)");
			
			$('<div class="myForm"><form id="authForm" ><div>\
			<div><input type="text" name="username" placeholder="Username" size="30"/></div>\
			<div><input type="checkBox" name="rememberMe" /><span>Remember</span></div></div>\
			<div><div><input placeholder="Password" type="password" name="password" size="30"/></div>\
			<div><button id="signinBut">Sign In</button></div></div></form> </div>').insertBefore('#statusBar');
			setStatus("Authentication Requried");
			var signinBut = document.getElementById("signinBut");
			signinBut.onclick = function(){
				startProcessRunner();
				var xhr = new XMLHttpRequest();
				xhr.open("POST", loginUrl,true);
				var params = $('#authForm').serialize();
				//serialize() 
				if(params.indexOf('rememberMe=on') >= 0 ) 
					params = params.replace('rememberMe=on', 'rememberMe=true');
				console.log(params);
				xhr.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
				xhr.onreadystatechange = function(){
				
					if(xhr.readyState == 4 && xhr.status == 200){
						var data = JSON.parse(xhr.responseText);
						if(data.result != undefined ){
							if(data.result.authenticationResult.setAuthenticationToken){
								//call background sync state
								
								setStatus('Logged in successfully');
								stopProcessRunner();
								chrome.extension.sendRequest({opt:"syncState"}, function(response) {
								});

                                //change evernote button label
                                //updateUI();
							}
						}

						else if(data.errors!=null && data.errors!=undefined){
							setStatus('Incorrect username or password');
						}
					}
				}
				xhr.send(params);
				return false;
			};
}
function setStatus(mssg){
	$('#statusBar > span').html(mssg);
}

function updateUI(){
    console.log("Updateing UI");
    if(evernoteBooks!=null){
        var snipControl = document.querySelector("#snipControl");
        snipControl.addEventListener("webkitTransitionEnd", showEditNoteForm, false);
        $("#snipControl").css('height', parseInt($('#snipControl').css('height'))  + 80 + 'px');
        document.getElementById('evernoteBut').innerText = "Create Note";
    }else{
        document.getElementById('evernoteBut').innerText = "Evernote";
    }
}


function addListenerToEvernoteBut(){
    var button = document.getElementById('evernoteBut');
	button.onclick = function(){
		addToEvernote();
	};
}

function addListenerToEditBut(){
	var button = document.getElementById("editBut");
	button.onclick = function(){
		if(this.innerHTML == 'Edit'){
			//show edit menu		
		
			var snipControl = document.querySelector("#snipControl");
			snipControl.addEventListener("webkitTransitionEnd", showEditNoteForm, false);
			$("#snipControl").css('height', parseInt($('#snipControl').css('height'))  + 70 + 'px');
		}
		
		else if(this.innerHTML == 'Save'){
			//update setting obj
			defaultSettings.tagnames = $('input[name="tagnames"]').val();
			defaultSettings.title = $('input[name="title"]').val();

			//close edit menu
			$('#editForm:parent').remove();
			//shorten popup window
			$("#snipControl").css('height', parseInt($('#snipControl').css('height'))  - 70 + 'px');
			$('#editBut').html('Edit');
		}
	}
}

function showEditNoteForm(){
		this.removeEventListener("webkitTransitionEnd", showEditNoteForm, false);
	//var parent = $("#snipControl > div:nth-child(2)");
			
			$('<div class="myForm"><form id="editForm" ><div>\
			<div style="width:60px"><label for="tagnames">Tags</label></div>\
			<div><input type="text" name="tagnames" placeholder="Tags - separated by commas" size="30" value="'+ defaultSettings.tagnames+ '"/></div>\
			</div>\
			<div><div style="width:60px"><label for="title">Title</label></div>\
			<div><input placeholder="Title" type="text" name="title" value="'+ defaultSettings.title+ '" size="30"/></div>\
            </div>\
            <div><div style="width:60px"><label for="comment">Comment</label></div>\
            <div><input placeholder="Comment" type="text" name="comment" style="width:100%" size="30"/></div>\
			</div></form> </div>').insertAfter('#controlBar');
			
			$('#editBut').html('Save');
}


function processBinary(binData, filename, filetype, boundary){
	var crlf = "\r\n";
	//var boundary = "--" + "----WebKitFormBoundarynpPf2woRwMfQQqnc";
	boundary = "--" + boundary;
	var data = crlf+ boundary + crlf  + "Content-Disposition: form-data; name=\"attachment\"; filename=\"" + filename+"\"" + crlf + "Content-Type: " + filetype +crlf + crlf + binData + crlf + boundary + "--" + crlf;
	return data;
}

function sendNotification(title, content){
	chrome.extension.sendRequest({opt:"notify",title: title, content:content}, function(response) {
	});
}

/**********************************************
 func: attachImage
 input: imgData - binary string of captured image
          filename - filename of the captured
 **********************************************/
function attachImage(imgData,filename){

	
	var boundary = generateBoundary();
	var data = processBinary(imgData, filename, "image/png",boundary);
	$.ajax({
	type:"POST",
	url:"https://www.evernote.com/shard/" + shardId + "/attach",
	accept:"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
	contentType:"multipart/form-data; boundary=" + boundary,
	beforeSend:function(httpr){
		httpr.setRequestHeader('Cache-Control','max-age=0');
		httpr.setRequestHeader('Accept','text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8');
	},
			
	data: data,
	success: function(data){
		//if logged in failed 
		if(data.indexOf('Not+logged+in') >= 0 ){
			console.log("missing authentication");
			var hasForm = document.getElementById('authForm');	
			if(hasForm==null || hasForm == undefined){
				addAuthForm();
				stopProcessRunner();
			}
		}
		else{
			//get attached file id		
			var matches= /%3Cid%3E((.)*)%3C%2Fid%3E/.exec(data);		
			//create a new note with the file as attachment
			console.log("attachment id = " + matches[1]);
			createNewEvernoteNote(matches[1], "http://snipper.com");
		}
	},
	error: function(xhr, textStatus, errorThrown){
		console.log("ERROR: " + errorThrown + " " +textStatus);
	}	
	});
}

function attachImageUsingNativeXHR(imgData,filename, filetype){
	
	var boundary = generateBoundary();
	var data = processBinary(imgData, filename, filetype, boundary);
	var xhr = new XMLHttpRequest();
	xhr.open("POST", "https://www.evernote.com/shard/" +shardId + "/attach",true);
	xhr.onreadystatechange = function(){

		if(xhr.readyState == 4){
	
			if(xhr.responseText.indexOf('Not+logged+in') >= 0 ){
				if(hidePopUpTimer!=null) 
					clearTimeout(hidePopUpTimer);
				showPopUp(); //re-display pop up to have user login
				var hasForm = document.getElementById('authForm');	
				if(hasForm==null || hasForm == undefined){
					stopProcessRunner();
					addAuthForm();
				}
			}
			else{
				var matches= /%3Cid%3E((.)*)%3C%2Fid%3E/.exec(xhr.responseText);		
				//create a new note with the file as attachment
				console.log("attachment id = " + matches[1]);
				//setStatus('Creating note');
				onexit();
				createNewEvernoteNote(matches[1], window.location.href);
			}
		}
	};

	var contentType = "multipart/form-data; boundary="+boundary;
	xhr.setRequestHeader('Content-Type',contentType);
	xhr.sendAsBinary(data);
}
/******************************************************
	func: createNewEvernoteNote
	desc: create a new note in evernote
	input: attachId - id of the image captured when attach to evernote database
		     url - link to the site where the iamge was captured
 *******************************************************/
function createNewEvernoteNote(attachId, url){
        
		var boundary = generateBoundary();
		//"d518f49d-8d13-40fa-9739-246e1bf467b1"
		var data = createMultiPartPayload({format:"json",
											title:defaultSettings.title, 
											notebook:defaultSettings.notebook,
											tagnames:defaultSettings.tagnames,
											content:defaultSettings.comment,unsetLocation:"true",
											sourceURL:url,
											attachment:attachId}
											,boundary);			
		$.ajax({
			type: 'POST',
			url:"https://www.evernote.com/shard/" + shardId + "/note/",
			accept:"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
			contentType:"multipart/form-data; boundary=" + boundary,
			beforeSend:function(httpr){
				httpr.setRequestHeader('Cache-Control','max-age=0');
				httpr.setRequestHeader('Accept','text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8');
			},
			
			data: data,
			success: function(data){
				console.log(data);
				//on success, display notification
				sendNotification('Create new note', 'Snip ' + defaultSettings.title + ' uploaded successfully');
			},
			error: function(xhr, textStatus, errorThrown){
				console.log(errorThrown);
				console.log(textStatus);
				sendNotification(errorThrown, textStatus);
				//display notification of error
			}
		});
}
/*
function getSelectedNotebook(){
	console.log($('select option:selected'));
	$('select option:selected').each(function(){
		console.log(this);
		return this.value;
	});
}
*/
/****************************************************************
	func: processRunner 
*****************************************************************/
function initProcessRunner(){
	var processRunner = document.getElementById('processRunner');
	var unitW = processRunnerSize.width/ processRunnerSize.units;
	var unitH = processRunnerSize.height;
	var runnerCtx = processRunner.getContext('2d');
	runnerCtx.strokeStyle = '#fff';
	for ( var i = 0 ; i < processRunnerSize.units; i++){
		runnerCtx.strokeRect(i*unitW, 0, unitW, unitH);
	}
}

function startProcessRunner(){
	$('#processRunner').css('display','block');
	var unitW = processRunnerSize.width/processRunnerSize.units;
	var unitH = processRunnerSize.height;
	processRunnerSize.interval = 400;
	processRunnerSize.timer = setTimeout('incrementRunner(0,' + unitW + ',' + unitH + ')', processRunnerSize.interval );
}

function incrementRunner(order, unitW, unitH){
	if(order >= processRunnerSize.units)
		order = 0;
	var processRunner = document.getElementById('processRunner');
	//console.log(processRunner);
	var runnerCtx = processRunner.getContext('2d');
	runnerCtx.fillStyle = '#ccc';	
	for ( var i = 0 ; i < processRunnerSize.units; i++){
		runnerCtx.fillRect(i*unitW+1, 1, unitW-2, unitH-2);
		
	}
	runnerCtx.fillStyle = '#666';
	runnerCtx.fillRect(order*unitW + 1, 1, unitW-2, unitH - 2);
	processRunnerSize.timer = setTimeout('incrementRunner(' + (order+1) + ',' + unitW + ',' + unitH + ')', processRunnerSize.interval );
}

function stopProcessRunner(){
	$('#processRunner').css('display','none');
	clearTimeout(processRunnerSize.timer);
}		
		
		
