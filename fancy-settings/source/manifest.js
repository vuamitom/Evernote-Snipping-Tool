// SAMPLE
this.manifest = {
    "name": "My Extension",
    "icon": "icon.png",
    "settings": [
        {
            "tab": i18n.get("Information"),
            "group": i18n.get("Default"),
            "name": "notebook",
            "type": "popupButton",
            "label": i18n.get("Notebook"),
			"value":"cd9ad195-dbd0-4903-baa5-d517c74a32f6",
			"options": (function () {
				var opts = {}, count = 0, notebookList = null;
				opts.values = [];
				if(localStorage['evernote.notebooks'] != undefined && localStorage['evernote.notebooks'] != null)
					notebookList = JSON.parse(localStorage['evernote.notebooks']);
				if(notebookList!= null){
					for(var i = 0; i < notebookList.length ; i++){
						opts.values[count++] = {"value":notebookList[i].guid, "text":notebookList[i].name};
					}
				}
								
				return opts;
				
			})()

        },
	
        {
            "tab": i18n.get("Information"),
            "group": i18n.get("Default"),
            "name": "title",
            "type": "text",
            "label": i18n.get("Title"),
			"text": "default note title"
           
        },
		
		{
            "tab": i18n.get("Information"),
            "group": i18n.get("Default"),
            "name": "tagnames",
            "type": "text",
            "label": i18n.get("Tags"),
			"text": "default tags - separated by commas"
        },

		{
            "tab": i18n.get("Information"),
            "group": i18n.get("Account"),
            "name": "username",
            "type": "text",
            "label": i18n.get("Username")
        },
		
		
    ],
    "alignment": [
        [
            "title",	
			"tagnames"
        ]
    ]
};

