(function(){

L.Control.PanelLayers = L.Control.Layers.extend({
	options:{
		collapsed:false,
		position:'topright',
		autoZIndex:true,
	},
	initialize : function(baseLayers,overlays,options){
		
		L.setOptions(this,options);
		this._layers = {};
		this._groups = {};
		this._layersActives = [];
		this._lastZIndex  = 0;
		this._handlingClick = false;
		this._baseLayersCtrl = [];
		
		var i, n;
		
		for (i in baseLayers)
			if(baseLayers[i].group && baseLayers[i].layers) 
				for(n in baseLayers[i].layers)
					this._addLayer(baseLayers[i].layers[n], false, baseLayers[i].group);
			else
				this._addLayer(baseLayers[i], false);
		
		for (i in overlays)
		{
			var IsActiveMarker = true;
			
			if(overlays[i].group && overlays[i].layers) 
				for(n in overlays[i].layers)
				{	
					if(overlays[i].hasOwnProperty("marker") && overlays[i].marker.hasOwnProperty("active"))
					{
						IsActiveMarker =overlays[i].marker.active;
					}
					this._addLayer(overlays[i].layers[n], true, overlays[i].group,IsActiveMarker);
				}
			else	
			{	
				//var filter = this.getfilter(overlays[i].name,overlays[i]filterSetting);
				if(overlays[i].hasOwnProperty("marker") && overlays[i].marker.hasOwnProperty("active"))
				{
					IsActiveMarker =overlays[i].marker.active;
				}
				this._addLayer(overlays[i], true, overlays[i].group,IsActiveMarker);
			}
		}
	},
	getfilter:function(layerName,filterSetting){
		for (i in filterSetting)
		{
			if(layerName == filterSetting[i].layer)
				return filterSetting[i].filter;
		}
		return null;
	},
	onAdd: function (map) {
		
		for(var i in this._layersActives)
			map.addLayer(this._layersActives[i]);

		L.Control.Layers.prototype.onAdd.call(this, map);

		return this._container;
	},
	addBaseLayer: function (layer, name, group) {
		layer.name = name || layer.name || '';
		this._addLayer(layer, false, group);
		this._updateLayers();
		return this;
	},
	addOverlay: function (layer, name, group) {
		layer.name = name || layer.name || '';
		this._addLayer(layer, true, group);
		this._updateLayers();
		return this;
	},
	_addLayer: function (layer,overlay,group,IsActiveMarker){
	
		var layerLayer = this._instanceLayer(layer.layer);
		var id = L.stamp(layerLayer),markertype,displayname;
		
		if(layer.active)
			this._layersActives.push(layerLayer);
		
		if(layer.marker && layer.marker.control)
			markertype =layer.marker.control;
		if(layer.marker && layer.marker.displayname)
			displayname =layer.marker.displayname;
	
		this._layers[id] = {
			layer:layerLayer,
			name: layer.name,
			icon: layer.icon,
			overlay: overlay,
			group :group,
			markertype:markertype,
			displayname: displayname,
			filter:layer.filter,
			subcontrols:[],
			subfiltercontrols:[],
			IsActiveMarker: IsActiveMarker,
		};
		
		if(this.options.autoZIndex && layerLayer.setZIndex){
			this._lastZIndex++;
			layerLayer.setZIndex(this._lastZIndex);
		}
	},
	_instanceLayer:function(layerDef){
		if(layerDef instanceof L.Class)
			return layerDef;
		else if(layerDef.type && layerDef.args)
			return this._getPath(L, layerDef.type).apply(window, layerDef.args);
	},
	_createItem: function(obj) {
		var className = 'leaflet-panel-layers',
			label, input, checked;
		
		
		checked = this._map.hasLayer(obj.layer);
		var inputid = L.stamp(obj.layer);
		if (obj.overlay) {
			label = L.DomUtil.create('label', className + '-layer');
			input = document.createElement('input');
			input.type = 'checkbox';
			input.className = 'leaflet-control-layers-selector';
			input.defaultChecked = checked;
			L.DomEvent.on(input, 'click', this._onInputClick, this);
			
		} else {
			label = L.DomUtil.create('label', className + '-item');
			input = this._createRadioElement('leaflet-base-layers', checked);
			input.id="base-layer"+inputid;
			L.DomEvent.on(input, 'click', this._onbaselayersInputClick, this);
			this._baseLayersCtrl.push({id : input.id,type:"radio"});
		}
		input.setAttribute( "data-layerId", inputid );
		input.layerId = L.stamp(obj.layer);

		
		label.appendChild(input);

		if(obj.icon) {
			var icon = L.DomUtil.create('i', className+'-icon');
			icon.innerHTML = obj.icon || '';
			label.appendChild(icon);
		}
		var name = document.createElement('span');
		name.innerHTML = ' ' + obj.name;
		label.appendChild(name);

		return label;
	},
	_createMarkerItem: function(obj,layerId) {
		var className = 'leaflet-panel-layers',
			label, input,that = this;
		
		label = L.DomUtil.create('label', className + '-item');
		
		input = document.createElement('span');
		input.className = 'leaflet-control-layers-selector';
		var name = document.createTextNode(' ' + obj.feature.properties.name);
		label.innerHTML = ' ' + obj.feature.properties.name;
		label.setAttribute( "data-lat", obj._latlng.lat );    
		label.setAttribute( "data-lon", obj._latlng.lng ); 
		label.setAttribute( "data-layerid", layerId );
		label.setAttribute( "data-markerid", obj._leaflet_id );
		label.layerId = L.stamp(obj);
		label.id ="label"+label.layerId;
		this._layers[layerId].subcontrols.push({id : label.id,type:"label"});
		
		L.DomEvent
        .addListener(label, 'click', L.DomEvent.stopPropagation)
        .addListener(label, 'click', L.DomEvent.preventDefault)
        .addListener(label, 'click', this._onMarkerClick,this);
		L.DomEvent
		 .on(label, 'mouseover', function(e) {
				 that._onMarkerMouseOver(e);
			 }, this)
			 .on(label, 'mouseout', function(e) {
				 that._onMarkerMouseOut(e);
			 }, this);			

		label.appendChild(input);

		if(obj.icon) {
			var icon = L.DomUtil.create('i', className+'-icon');
			icon.innerHTML = obj.icon || '';
			label.appendChild(icon);
		}
		return label;
	},
	_createMarkerDropDown: function(obj){
		
		var className = 'leaflet-panel-layers',
			selectList, option,layer= obj.layer,selectGroup,name,title = obj.name;
		
		var id = L.stamp(layer);		
		if(obj.displayname)
			title = obj.displayname; 
		selectGroup = L.DomUtil.create('legend', className + '-grouplabel');
		name = document.createElement('span');
		name.innerHTML = ' ' + title;
		selectGroup.id=title.toLowerCase();
				
		selectGroup.appendChild(name);
		selectList = L.DomUtil.create('select', className + '-item');
		
		
		selectList.id ="dropdown"+id;
		this._layers[id].subcontrols.push({id : selectList.id,type:"dropdown"});
		var that = this;
		for (var opt in layer._layers) {
			if(layer._layers[opt].feature){
			var option = document.createElement("option");
			option.value = layer._layers[opt].feature.properties.name;
			option.text = layer._layers[opt].feature.properties.name;
			option.setAttribute( "data-lat", layer._layers[opt]._latlng.lat );    
			option.setAttribute( "data-lon", layer._layers[opt]._latlng.lng );  
			selectList.appendChild(option);
			}
		};
		L.DomEvent
        .addListener(selectList, 'change', L.DomEvent.stopPropagation)
        .addListener(selectList, 'change', L.DomEvent.preventDefault)
        .addListener(selectList, 'change', this._onMarkerChange,this);
		
		selectGroup.appendChild(selectList);
		return selectGroup;
	},
	_createMarkerAccordion:function(obj){
		var className = 'leaflet-panel-layers',
		accordion, li,name=obj.name,title=obj.name,layer=obj.layer;
		
		accordion = L.DomUtil.create('ul','leaflet-panel-layers-accordion');
		var id = L.stamp(layer);
		if(obj.displayname)
			title = obj.displayname; 
		accordion.id ="accordion"+id;
		this._layers[id].subcontrols.push({id : accordion.id,type:"accordion"});
		li = document.createElement("li");
		li.innerHTML = ' ' + title;
		L.DomEvent
        .addListener(li, 'click', L.DomEvent.stopPropagation)
        .addListener(li, 'click', L.DomEvent.preventDefault)
        .addListener(li, 'click', this._onAccordionClick,this);
		accordion.appendChild(li);
		ul = L.DomUtil.create('ul');
		var that = this;
		for (var opt in layer._layers) {
			if(layer._layers[opt].feature && layer._layers[opt].feature.properties)
			{
				var li = document.createElement("li");
				var a = document.createElement("a");
				a.innerHTML = layer._layers[opt].feature.properties.name;
				a.setAttribute( "href", "#" ); 
			//	a.setAttribute( "onclick", "map.panTo( new L.LatLng("+layer._layers[opt]._latlng.lat+", "+layer._layers[opt]._latlng.lng+" ) );return true;" ); 
				li.setAttribute( "data-lat", layer._layers[opt]._latlng.lat );    
				li.setAttribute( "data-lon", layer._layers[opt]._latlng.lng );  
				a.setAttribute( "data-lat", layer._layers[opt]._latlng.lat );    
				a.setAttribute( "data-lon", layer._layers[opt]._latlng.lng );  
				a.id= accordion.id+"_"+opt;
				this._layers[id].subcontrols.push({id : a.id,type:"accordion_li"});
				L.DomEvent
				.addListener(a, 'click', L.DomEvent.stopPropagation)
				.addListener(a, 'click', L.DomEvent.preventDefault)
				.addListener(a, 'click', this._onMarkerClick,this);
				li.appendChild(a);
				ul.appendChild(li);
			}
		};
		accordion.appendChild(ul);
		return accordion;
	},
	_createMarkerAccordionCheckbox:function(obj){
		var className = 'leaflet-panel-layers',
		accordion,input, li,name=obj.name,title=obj.name,layer=obj.layer;
		
		accordion = L.DomUtil.create('ul','leaflet-panel-layers-accordion');
		var id = L.stamp(layer);
		if(obj.displayname)
			title = obj.displayname; 
		accordion.id ="accordion"+id;
		this._layers[id].subcontrols.push({id : accordion.id,type:"accordion"});
		li = document.createElement("li");
		li.innerHTML = ' ' + title;
		L.DomEvent
        .addListener(li, 'click', L.DomEvent.stopPropagation)
        .addListener(li, 'click', L.DomEvent.preventDefault)
        .addListener(li, 'click', this._onAccordionClick,this);
		accordion.appendChild(li);
		ul = L.DomUtil.create('ul');
		var that = this;
		for (var opt in layer._layers) {
			if(layer._layers[opt].feature && layer._layers[opt].feature.properties)
			{
				var li = document.createElement("li");
				input = document.createElement('input');
				input.type = 'checkbox';
				input.className = 'leaflet-control-layers-selector';
				input.layerId = id;
				input.setAttribute( "data-layerId", id );
				input.setAttribute( "data-markername", layer._layers[opt].feature.properties.name );
				input.setAttribute( "data-markerid", layer._layers[opt]._leaflet_id );
				
				L.DomEvent.on(input, 'click', this._onAccordionCheckBoxClick, this);
				input.defaultChecked = true;
				var a = document.createElement("a");
				a.innerHTML = layer._layers[opt].feature.properties.name;
				a.setAttribute( "href", "#" ); 
				a.setAttribute( "onclick", "map.panTo( new L.LatLng("+layer._layers[opt]._latlng.lat+", "+layer._layers[opt]._latlng.lng+" ) );return true;" ); 
				li.setAttribute( "data-lat", layer._layers[opt]._latlng.lat );    
				li.setAttribute( "data-lon", layer._layers[opt]._latlng.lng );  
				a.id= accordion.id+"_"+opt;
				this._layers[id].subcontrols.push({id : a.id,type:"accordion_li"});
				li.appendChild(input);
				li.appendChild(a);
				ul.appendChild(li);
			}
		};
		accordion.appendChild(ul);
		return accordion;
	},
	_onMarkerMouseOver:function(e){
		var target =e. currentTarget;
		var layerId = e.currentTarget.getAttribute( "data-layerid" );
		var obj = this._layers[layerId];
		
		var markerid = e.currentTarget.getAttribute( "data-markerid" );
		for(ml in this._map._layers) {
			var layer = this._map._layers[ml];
			if (layer.feature) {
				if(layer.options.title.toLowerCase()==obj.name.toLowerCase())
				{
					if(layer._leaflet_id==markerid)
					{
						//layer._icon.src="images/select-marker.png";
						layer._icon.style.backgroundColor='#08f';
						layer._icon.style.cursor='#08f';
						
					}
				}
			
			}
		}
	},
	_onMarkerMouseOut:function(e){
		var target =e. currentTarget;
		var layerId = e.currentTarget.getAttribute( "data-layerid" );
		var obj = this._layers[layerId];
		
		var markerid = e.currentTarget.getAttribute( "data-markerid" );
		for(ml in this._map._layers) {
			var layer = this._map._layers[ml];
			if (layer.feature) {
				if(layer.options.title.toLowerCase()==obj.name.toLowerCase())
				{
					if(layer._leaflet_id==markerid)
					{
					 //layer._icon.src="http://cdn.leafletjs.com/leaflet/v0.7.7/images/marker-icon.png";
					 layer._icon.style.backgroundColor='';
						
					}
				}
			
			}
		}
	},
	_onAccordionCheckBoxClick:function(e){
		var target =e. currentTarget;
		var layerId = e.currentTarget.getAttribute( "data-layerid" );
		var obj = this._layers[layerId];
		
		var markername = e.currentTarget.getAttribute( "data-markername" );
		var markerid = e.currentTarget.getAttribute( "data-markerid" );
		for(ml in this._map._layers) {
			var layer = this._map._layers[ml];
			if (layer.feature) {
				if(layer.options.title.toLowerCase()==obj.name.toLowerCase())
				{
					if(layer._leaflet_id==markerid)
					{
						if(target.checked){
							layer._icon.style.display="";
						}else
						{
							layer._icon.style.display="none";
						}
					}
				}
			
			}
		}
	},
	_onAccordionClick:function(e){
		var id =e. currentTarget;
		$(id).next().slideToggle(300);
	},
	_createFilterDropDown:function(obj,field,layername){
		var className = 'leaflet-panel-layers',
			selectList, option,selectGroup,name;
			
		selectGroup = L.DomUtil.create('legend', className + '-grouplabel');
		name = document.createElement('span');
		name.innerHTML = ' ' + field;
		selectGroup.id=layername.toLowerCase();
				
		selectGroup.appendChild(name);
		selectList = L.DomUtil.create('select', className + '-item');
		selectList.setAttribute( "data-layerId", obj._leaflet_id);  
		
		var options  = [];
		for (var opt in obj._layers) {
			if(obj._layers[opt].feature && obj._layers[opt].feature.properties)
			{
				var fieldName = obj._layers[opt].feature.properties[field];
				if(options.indexOf(fieldName) == -1)
				{
					options.push(obj._layers[opt].feature.properties[field])
				}
				selectList.setAttribute( "data-layer", obj._layers[opt]._latlng.lat ); 
			}	
		};
		selectList.id = "Filter"+field+obj._leaflet_id;
		selectList.setAttribute( "data-field", field );
		var layerid = L.stamp(obj);
		this._layers[layerid].subfiltercontrols.push({id : selectList.id,type:"dropdown",field:field});
		var optionall = document.createElement("option");
		optionall.value = "All";
			optionall.text = "All";
			optionall.id = field;
			selectList.appendChild(optionall);
		for (var opt in options) {
			var option = document.createElement("option");
			option.value = options[opt];
			option.text = options[opt];
			option.id = field;
			selectList.appendChild(option);
		};
		selectGroup.appendChild(selectList);
		L.DomEvent
        .addListener(selectList, 'change', L.DomEvent.stopPropagation)
        .addListener(selectList, 'change', L.DomEvent.preventDefault)
        .addListener(selectList, 'change', this._onDropDownFilter,this);
		return selectGroup;
	},
	_createFilterCheckBox:function(obj,field,layername){
		var className = 'leaflet-panel-layers',
			checkboxList,name , input, label;
	
		checkboxList = L.DomUtil.create('legend', className + '-grouplabel');
		name = document.createElement('span');
		name.innerHTML = ' ' + field;
		checkboxList.appendChild(name);
		
		var options  = [];
		for (var opt in obj._layers) {
			if(obj._layers[opt].feature)
			{
				var fieldName = obj._layers[opt].feature.properties[field];
				if(options.indexOf(fieldName) == -1)
				{
					options.push(obj._layers[opt].feature.properties[field])
				}
			}	
		};
		var id = L.stamp(obj);
		//cannot just use field because it will be conflicted with other layers' field.
		checkboxList.id = "Filter"+field+id;
		
		for (var opt in options) {
			label = L.DomUtil.create('label', className + '-item');
		    input = document.createElement('input');
			input.type = 'checkbox';
			input.className = 'leaflet-control-layers-selector';
			input.defaultChecked = "true";
			var name = document.createElement('span');
			name.innerHTML = ' ' + options[opt];
			input.id = "Filter"+field+"Ctrl"+opt;
			input.value =options[opt];
			input.setAttribute( "data-layerId", L.stamp(obj) );
			input.setAttribute( "data-field", field );
			input.setAttribute( "data-layername", layername );
			this._layers[id].subfiltercontrols.push({id : input.id,type:"checkbox",field:field});
			label.appendChild(input);
			label.appendChild(name);
			L.DomEvent
			.addListener(input, 'change', L.DomEvent.stopPropagation)
			.addListener(input, 'change', L.DomEvent.preventDefault)
			.addListener(input, 'change', this._onCheckBoxFilter,this);
			
			checkboxList.appendChild(label);
		};
		
		return checkboxList;
	},
	
	_createFilterRadio:function(obj,field){
		var className = 'leaflet-panel-layers',
			RadioList,name, input,label;
	
		RadioList = L.DomUtil.create('legend', className + '-grouplabel');
		name = document.createElement('span');
		name.innerHTML = ' ' + field;
		RadioList.appendChild(name);
		RadioList.setAttribute( "data-layerId", L.stamp(obj) );  		
	
		var options  = [];
		for (var opt in obj._layers) {
			if(obj._layers[opt].feature && obj._layers[opt].feature.properties)
			{
				var fieldName = obj._layers[opt].feature.properties[field];
				if(options.indexOf(fieldName) == -1)
				{
					options.push(obj._layers[opt].feature.properties[field])
				}
			}
		};
		RadioList.id ="FilterRadio"+field;
		var id = L.stamp(obj);
		this._layers[id].subfiltercontrols.push({id : RadioList.id,type:"radio",field:field});
		label = L.DomUtil.create('label', className + '-item');
		input = this._createRadioElement(RadioList.id+"option", true);
		input.setAttribute( "data-layerId", L.stamp(obj) );	
		var name = document.createElement('span');
		name.innerHTML = ' ' + "All";
		input.id = field+"Ctrl";
		input.value ="All";
		label.appendChild(input);
		label.appendChild(name);
		RadioList.appendChild(label);
		for (var opt in options) {
			label = L.DomUtil.create('label', className + '-item');
		    input = this._createRadioElement(RadioList.id+"option", false);
			var name = document.createElement('span');
			name.innerHTML = ' ' + options[opt];
			input.id = field+"Ctrl"+opt;
			input.value =options[opt];
			label.appendChild(input);
			label.appendChild(name);
		    this._layers[id].subfiltercontrols.push({id : input.id,type:"radio",field:field});
			RadioList.appendChild(label);
		};
		L.DomEvent
        .addListener(RadioList, 'change', L.DomEvent.stopPropagation)
        .addListener(RadioList, 'change', L.DomEvent.preventDefault)
        .addListener(RadioList, 'change', this._onRadioFilter,this);
		return RadioList;
	},
	_createFilterAccordionCheckBox:function(obj,field,layername){
		var className = 'leaflet-panel-layers',
		accordion,input, li;
		
		accordion = L.DomUtil.create('ul','leaflet-panel-layers-accordion');
		var id = L.stamp(obj);
		accordion.id ="accordion"+id;
		li = document.createElement("li");
		li.innerHTML = ' ' + field;
		L.DomEvent
        .addListener(li, 'click', L.DomEvent.stopPropagation)
        .addListener(li, 'click', L.DomEvent.preventDefault)
        .addListener(li, 'click', this._onAccordionClick,this);
		accordion.appendChild(li);
		ul = L.DomUtil.create('ul');
		var that = this;
		
		var options  = [];
		for (var opt in obj._layers) {
			if(obj._layers[opt].feature && obj._layers[opt].feature.properties)
			{
				var fieldName = obj._layers[opt].feature.properties[field];
				if(options.indexOf(fieldName) == -1)
				{
					options.push(obj._layers[opt].feature.properties[field])
				}
			}
		};
		for (var opt in options) {
			
			var li = document.createElement("li");
			label = L.DomUtil.create('label', className + '-item');
		    input = document.createElement('input');
			input.type = 'checkbox';
			input.className = 'leaflet-control-layers-selector';
			input.defaultChecked = "true";
			var name = document.createElement('span');
			name.innerHTML = ' ' + options[opt];
			input.id = "Filter"+field+"Ctrl"+opt;
			input.value =options[opt];
			input.setAttribute( "data-layerId", L.stamp(obj) );
			input.setAttribute( "data-field", field );
			input.setAttribute( "data-layername", layername );
			li.appendChild(input);
			li.appendChild(name);
			ul.appendChild(li);
			this._layers[id].subfiltercontrols.push({id : input.id,type:"accordioncheckbox",field:field});
			L.DomEvent
			.addListener(input, 'change', L.DomEvent.stopPropagation)
			.addListener(input, 'change', L.DomEvent.preventDefault)
			.addListener(input, 'change', this._onCheckBoxFilter,this);
			
		};
		accordion.appendChild(ul);
		return accordion;
	},
	_CheckBoxFilter : function(layer,field,fieldId,subfiltercontrols){
		
		if(layer.feature.properties[field])
		{
			var input = document.getElementById(fieldId);
			if(input.checked)
			{
				if(input.value ==layer.feature.properties[field])
				{
					layer._icon.style.display="";
					this._subfilter(layer,subfiltercontrols,this);
				}
									
			}
			else
			{
				if(input.value ==layer.feature.properties[field])
				{
							layer._icon.style.display="none";
				}
									
			}
		}	
	},
	_onCheckBoxFilter:function(e){
		this._handlingClick = true;
		
		var filter = e.currentTarget;
		var layerId = e.currentTarget.getAttribute( "data-layerid" );
		var field = e.currentTarget.getAttribute( "data-field" );
		var layerName = e.currentTarget.getAttribute( "data-layername" );
		var subfiltercontrols = this.unset(this._layers[layerId].subfiltercontrols,filter.id);
		for(ml in this._map._layers) {
			if (this._map._layers[ml].feature) {
				if(this._map._layers[ml].options.title.toLowerCase()==layerName.toLowerCase())
				{
					this._CheckBoxFilter(this._map._layers[ml],field,filter.id,subfiltercontrols);
				}
			
			}
		}
	},
	_RadioFilter: function(layer,field,fieldId,subfiltercontrols){
		var allMarkersObjArray = []; // for marker objects
		var allMarkersGeoJsonArray = []; // for readable geoJson markers
		if(layer.feature.properties[field])
		{
			var val = document.getElementById(fieldId);
			var value="";
			for(index in val.childNodes)
			{
				if(val.childNodes[index].childNodes[0].checked)
				{
					value = val.childNodes[index].childNodes[0].value;
					break;
				}
			}
			
			if("all"==value.toLowerCase())
			{
				allMarkersObjArray.push(layer)
				allMarkersGeoJsonArray.push(JSON.stringify(layer.toGeoJSON()));
				layer._icon.style.display="";
				this._subfilter(layer,subfiltercontrols,this);
			}
			else if(layer.feature.properties[field].toLowerCase()==value.toLowerCase())
			{
				allMarkersObjArray.push(layer)
				allMarkersGeoJsonArray.push(JSON.stringify(layer.toGeoJSON()));
				//filter again because there are other filter controls
				layer._icon.style.display="";
				this._subfilter(layer,subfiltercontrols,this);
			}
			else{
					//don't filter again
				layer._icon.style.display="none";
			}
		}
	},
	_onRadioFilter:function(e){
		this._handlingClick = true;

	
		var filter = e.currentTarget;
		var layerId = e.currentTarget.getAttribute( "data-layerid" );
		var subfiltercontrols = this.unset(this._layers[layerId].subfiltercontrols,filter.id);
		for(ml in this._map._layers) {
			if (this._map._layers[ml].feature && this._map._layers[ml].options.title) {
				//find out which layer to filter
				if(this._map._layers[ml].options.title.toLowerCase()==filter.parentElement.id.toLowerCase())
				{
					this._RadioFilter(this._map._layers[ml],filter.id.substring(11),filter.id,subfiltercontrols);
				}
			
			}
		}
	},
	_DropDownFilter: function(layer,field,fieldId,subfiltercontrols){
		if(layer.feature.properties[field])
		{
			var filter = document.getElementById(fieldId);
			if("all" == filter.value.toLowerCase())
			{
				layer._icon.style.display="";
				that._subfilter(layer,subfiltercontrols,that);
			}
			else if(layer.feature.properties[field].toLowerCase()==filter.value.toLowerCase())
			{
				layer._icon.style.display="";
			}else{
				layer._icon.style.display="none";
			}
		}
	},
	_onDropDownFilter:function(e){
		this._handlingClick = true;
		var filter = e.currentTarget;
		var layerId = e.currentTarget.getAttribute( "data-layerid" );
		var field = e.currentTarget.getAttribute( "data-field" );
		var subfiltercontrols = this.unset(this._layers[layerId].subfiltercontrols,filter.id);
		var that = this;
		$.each(this._map._layers, function (ml) {
			var layer =this._map._layers[ml];
			if (layer.feature) {
				if(layer.options.title.toLowerCase()==filter.parentElement.id.toLowerCase())
				{
					if(layer.feature.properties[field])
					{
						if("all" == filter.value.toLowerCase())
						{
							layer._icon.style.display="";
							that._subfilter(layer,subfiltercontrols,that);
						}
						else if(layer.feature.properties[field].toLowerCase()==filter.value.toLowerCase())
						{
							layer._icon.style.display="";
							that._subfilter(layer,subfiltercontrols,that);
						}else{
							layer._icon.style.display="none";
						}
					}
				}
			
			}
		})
		this._handlingClick = false;
	},
	_onMarkerChange: function (e){
		this._handlingClick = true;
		for (var opt in e.currentTarget) {
			if(e.currentTarget[opt].selected)
			{
				var lat = e.currentTarget[opt].getAttribute( "data-lat" );
				var lon = e.currentTarget[opt].getAttribute( "data-lon" );
				this._map.panTo( new L.LatLng( lat, lon ) );
				break;
			}
		}
		 this._handlingClick = false;
	},
	_addItem: function (obj) {
		
		var className ='leaflet-panel-layers',label,input,icon,checked;
		
		var container = obj.overlay? this._overlaysList : this._baseLayersList;
		
		if(obj.group) {
			
			if(!this._groups[obj.group])
			{
				this._groups[obj.group] = L.DomUtil.create('fieldset', className + '-group', container);
				label = L.DomUtil.create('legend', className + '-grouplabel');
				var name = document.createElement('span');
				name.innerHTML = ' ' + obj.group;
				this._groups[obj.group].id =obj.group;
				label.appendChild(name);
				this._groups[obj.group].appendChild(label);
			}
		
			container = this._groups[obj.group];
			label = this._createItem(obj);

			container.appendChild(label);
		}
		else{
			label = this._createItem(obj);

			container.appendChild(label);
		}
		
		if(obj.layer)
		{
			if(obj.group)
			{
				if(!this._groups[obj.group])
				{
					var title = obj.name
					if(obj.displayname)
						title = obj.displayname; 
					this._groups[obj.group]   = L.DomUtil.create('fieldset', className + '-group', container);
					this._groups[obj.group].name =obj.name;
					label = L.DomUtil.create('legend', className + '-grouplabel');
					var name = document.createElement('span');
					name.innerHTML = ' ' + title;
					label.appendChild(name);
					this._groups[obj.group].appendChild(label);
				}
				container = this._groups[obj.group];
			}
		
			
			checked = obj.layer.active;
			if(checked == undefined)
					checked =false;
	
			var that = this;
			if(obj.IsActiveMarker)
			{
				if(!obj.markertype){
					var layerId = L.stamp(obj.layer);
					Object.keys(obj.layer._layers).forEach(function(key) {
						if(obj.layer._layers[key].feature){
							label = that._createMarkerItem(obj.layer._layers[key],layerId);
							container.appendChild(label);
						}
					});
				}
				else if(obj.markertype.toLowerCase() =="dropdown"){
					var selectList = that._createMarkerDropDown(obj);
					container.appendChild(selectList);
				}
				else if(obj.markertype.toLowerCase() =="accordion"){
					
					var accordion = that._createMarkerAccordion(obj);
					container.appendChild(accordion);
				}
				else if(obj.markertype.toLowerCase() =="accordioncheckbox"){
					
					var accordion = that._createMarkerAccordionCheckbox(obj);
					container.appendChild(accordion);
				}
				else if(obj.markertype.toLowerCase() =="button"){
					
					var layerId = L.stamp(obj.layer);
					Object.keys(obj.layer._layers).forEach(function(key) {
						if(obj.layer._layers[key].feature){
							label = that._createMarkerItem(obj.layer._layers[key],layerId);
							container.appendChild(label);
						}
					});
				}	
				else
				{
					var layerId = L.stamp(obj.layer);
					Object.keys(obj.layer._layers).forEach(function(key) {
						if(obj.layer._layers[key].feature){
							label = that._createMarkerItem(obj.layer._layers[key],layerId);
							container.appendChild(label);
						}
					});
				}
			}
			
			if(obj.filter){
				for(var index in obj.filter){
					var selectList =this.addFilterItem(obj,index);
					container.appendChild(selectList);
				}
			}
		}
			

		return label;
	},
	addFilterItem: function(obj,i){
		var filter;
		if(obj.filter[i].type)
		{
			switch(obj.filter[i].type.toLowerCase()){
				case "dropdown":
					filter = this._createFilterDropDown(obj.layer,obj.filter[i].field,obj.name);
				break;
				case "checkbox":
					filter = this._createFilterCheckBox(obj.layer,obj.filter[i].field,obj.name);	
				break;
				case "radio":
					filter = this._createFilterRadio(obj.layer,obj.filter[i].field,obj.name);
						
				break;
				case "accordioncheckbox":
					var filter = this._createFilterAccordionCheckBox(obj.layer,obj.filter[i].field,obj.name);
				break;
			}
		}
		return filter;
	},
	_onbaselayersInputClick: function(e){
		var i, input, obj,layerId,inputsLen = this._baseLayersCtrl.length;
		this._handlingClick = true;
	    
		for (i = 0; i < inputsLen; i++) {
			input = document.getElementById(this._baseLayersCtrl[i].id);
			 layerId = input.getAttribute( "data-layerid" );
			obj = this._layers[layerId];

			if (input.checked && !this._map.hasLayer(obj.layer)) {
				this._map.addLayer(obj.layer);

			} else if (!input.checked && this._map.hasLayer(obj.layer)) {
				this._map.removeLayer(obj.layer);
			}
		}
		
		this._handlingClick = false;

		this._refocusOnMap();
		
	},
	_onInputClick: function (e) {
		var i, input, obj,
		input =e.currentTarget;
		var layerId = e.currentTarget.getAttribute( "data-layerid" );
		this._handlingClick = true;
	
			obj = this._layers[layerId];

			if(obj)
			{
				if (input.checked && !this._map.hasLayer(obj.layer)) {
					for(k in obj.subcontrols)
					{
						var subCtrl = document.getElementById(obj.subcontrols[k].id);
						switch (obj.subcontrols[k].type)
						{
							
							case "accordion_li" :
								subCtrl.style.pointerEvents = 'auto'; 
							break;
							case "dropdown":
								subCtrl.disabled  =false;
							break;
							case "label":
							subCtrl.disabled  =false;
								L.DomEvent
							.addListener(subCtrl, 'click', L.DomEvent.stopPropagation)
							.addListener(subCtrl, 'click', L.DomEvent.preventDefault)
							.addListener(subCtrl, 'click', this._onMarkerClick,this);
							break;	
						}
						//subCtrl.disabled  =false;
					}
					
					for(s in obj.subfiltercontrols)
					{
						var subFilterCtrl = document.getElementById(obj.subfiltercontrols[s].id);
						switch (obj.subfiltercontrols[s].type)
						{
							
							case "checkbox" :
								subFilterCtrl.disabled  =false;
							break;
							case "dropdown":
								subFilterCtrl.disabled  =false;
							break;
							case "radio":
							subFilterCtrl.disabled  =false;
								L.DomEvent
							.addListener(subFilterCtrl, 'click', L.DomEvent.stopPropagation)
							.addListener(subFilterCtrl, 'click', L.DomEvent.preventDefault)
							.addListener(subFilterCtrl, 'click', this._onRadioFilter,this);
							break;	
						}
					}
					
					this._map.addLayer(obj.layer);
					

				} else if (!input.checked && this._map.hasLayer(obj.layer)) {
					this._map.removeLayer(obj.layer);
					for(k in obj.subcontrols)
					{
						var subCtrl = document.getElementById(obj.subcontrols[k].id);
						switch (obj.subcontrols[k].type)
						{
							
							case "accordion_li" :
								subCtrl.style.pointerEvents = 'none'; 
							break;
							case "dropdown":
								subCtrl.disabled  =true;
							break;
							case "label":
								L.DomEvent.removeListener(subCtrl, 'click', L.DomEvent.stopPropagation)
							.removeListener(subCtrl, 'click', L.DomEvent.preventDefault)
							.removeListener(subCtrl, 'click', this._onMarkerClick,this);
							break;	
						}
						//subCtrl.disabled  =false;
					}
					
					for(s in obj.subfiltercontrols)
					{
						var subFilterCtrl = document.getElementById(obj.subfiltercontrols[s].id);
						switch (obj.subfiltercontrols[s].type)
						{
							
							case "checkbox" :
								subFilterCtrl.disabled  =true;
							break;
							case "dropdown":
								subFilterCtrl.disabled  =true;
							break;
							case "radio":
							subFilterCtrl.disabled  =true;
								L.DomEvent
							.removeListener(subFilterCtrl, 'click', L.DomEvent.stopPropagation)
							.removeListener(subFilterCtrl, 'click', L.DomEvent.preventDefault)
							.removeListener(subFilterCtrl, 'click', this._onRadioFilter,this);
							break;	
						}
					}
					
					
				}
			}	
		

		this._handlingClick = false;

		this._refocusOnMap();
	},
	_onMarkerClick:function(e){
		this._handlingClick = true;
		var lat = e.currentTarget.getAttribute( "data-lat" );
		var lon = e.currentTarget.getAttribute( "data-lon" );
		this._map.panTo( new L.LatLng( lat, lon ) );
	    this._handlingClick = false;

	},
	_subfilter: function(layer,subfiltercontrols,that ){
		if(subfiltercontrols){
			if(subfiltercontrols.length>0){					
				$.each(subfiltercontrols,function(index){
					switch(subfiltercontrols[index].type)
					{
						case "radio":
							that._RadioFilter(layer,subfiltercontrols[index].field,subfiltercontrols[index].id);
						break;
						case "checkbox":
							that._CheckBoxFilter(layer,subfiltercontrols[index].field,subfiltercontrols[index].id);
						break;
						case "dropdown":
							that._DropDownFilter(layer,subfiltercontrols[index].field,subfiltercontrols[index].id);
						break;
					}
				});
			}
		}
		
	},
	_initLayout: function () {
		
		var className = 'leaflet-panel-layers';
		var container = this._container = L.DomUtil.create('div',className);
		
		container.setAttribute('aria-haspopup',true);
		
		container.style.height = this._map.getSize().y+'px';

		this._map.on('resize', function(e) {
			container.style.height = e.newSize.y+'px';
		});
		
		
		var form = this._form = L.DomUtil.create('form', className + '-list');

		if (this.options.collapsed) {
			if (!L.Browser.android) {
				L.DomEvent
				    .on(container, 'mouseover', this._expand, this)
				    .on(container, 'mouseout', this._collapse, this);
			}
			var link = this._layersLink = L.DomUtil.create('a', className + '-toggle', container);
			link.href = '#';
			link.title = 'Layers';

			if (L.Browser.touch) {
				L.DomEvent
				    .on(link, 'click', L.DomEvent.stop)
				    .on(link, 'click', this._expand, this);
			}
			else {
				L.DomEvent.on(link, 'focus', this._expand, this);
			}

			this._map.on('click', this._collapse, this);
			// TODO keyboard accessibility
		} else {
			this._expand();
		}
		
		this._baseLayersList = L.DomUtil.create('div', className + '-base', form);
		this._separator = L.DomUtil.create('div', className + '-separator', form);
		this._overlaysList = L.DomUtil.create('div', className + '-overlays', form);

		container.appendChild(form);
	},
	_expand: function () {
		L.DomUtil.addClass(this._container, 'leaflet-panel-layers-expanded');
	},
	_collapse: function () {
		this._container.className = this._container.className.replace(' leaflet-panel-layers-expanded', '');
	},
	_getPath: function(obj, prop){
		var parts = prop.split('.'),
			last = parts.pop(),
			len = parts.length,
			cur = parts[0],
			i = 1;
			
		if(len >0)
			while((obj = obj[cur]) && i < len)
				cur = parts[i++];
		
		if(obj)
			return obj[last];
		
	},
	unset : function(array,value) {
		var subs =[];
		var that = this;
		$.each(array,function(index){
			if(array[index].id != value && that.stringStartWith(array[index].id,"Filter" ))
				subs.push(array[index]);
		})
		return subs;
	},
	stringStartWith: function(string,prefix){
		return string.slice(0, prefix.length) == prefix;
	}

});
	
L.Control.panelLayers = function(baseLayers, overlays,options){
	console.log('panelLayers');
	return new L.Control.PanelLayers(baseLayers, overlays, options);
};
	
}).call(this);
