
/**
 * Copyright (C) 2023, 2024 Alex Bodnaru
 * 
 * This file is part of SQLiteXplorer.
 * SQLiteXplorer is free software: 
 * you can redistribute it and/or modify it 
 * under the terms of the 
 * GNU Lesser General Public License as 
 * published by the Free Software Foundation, 
 * either version 3 of the License, 
 * or (at your option) any later version.
 * SQLiteXplorer is distributed 
 * in the hope that it will be useful, 
 * but WITHOUT ANY WARRANTY; 
 * without even the implied warranty of 
 * MERCHANTABILITY or FITNESS FOR A 
 * PARTICULAR PURPOSE. 
 * See the GNU Lesser General Public License 
 * for more details.
 * You should have received a copy of the 
 * GNU Lesser General Public License along 
 * with SQLiteXplorer. If not, 
 * see <https://www.gnu.org/licenses/>.
 */
"use strict";

class SelectHitTolerance {
	formCode = `
		<form>
			<label>
				Hit tolerance for selecting features:
				<br />Area: &nbsp;
				<canvas class="circle" width="22" height="22" style="vertical-align: middle;"></canvas>
				&nbsp;
				<select class="hitTolerance">
					<option value="0" selected>0 Pixels</option>
					<option value="5">5 Pixels</option>
					<option value="10">10 Pixels</option>
				</select>
			</label>
		</form>
		`;
	hitTolerance = 0;
	
	constructor(formElem) {
		this.formElem = document.querySelector(formElem);
		this.formElem.textContent = '';
		this.formElem.insertAdjacentHTML('beforeend', this.formCode);
		this.selectHitTolerance = this.formElem.querySelector('.hitTolerance');
		this.circleCanvas = this.formElem.querySelector('.circle');
		this.selectHitTolerance.addEventListener('change', e => {this.changeHitTolerance();});
		this.changeHitTolerance();
	}
	
	changeHitTolerance() {
		this.hitTolerance = parseInt(
			this.selectHitTolerance.value, 10);
		
		const size = 2 * this.hitTolerance + 2;
		this.circleCanvas.width = size;
		this.circleCanvas.height = size;
		const ctx = this.circleCanvas.getContext('2d');
		ctx.clearRect(0, 0, size, size);
		ctx.beginPath();
		ctx.arc(
			this.hitTolerance + 1,
			this.hitTolerance + 1,
			this.hitTolerance + 0.5,
			0,
			2 * Math.PI
		);
		ctx.fill();
		ctx.stroke();
	}
};

class DisplayDriver {
	
	constructor() {
	}
	
	static jsLoad(src, module=false) {
		if (!src) {
			return Promise.resolve();
		}
		return new Promise((resolve, reject) => {
			let s = document.createElement('script');
			s.src = src;
			if (module) {
				s.type='module';
			}
			s.async = false;
			s.crossorigin = "anonymous";
			s.onload = resolve;
			s.onerror = reject;
			document.head.append(s);
		});
	}
	
	static cssLoad(src) {
		if (!src) {
			return Promise.resolve();
		}
		return new Promise((resolve, reject) => {
			let s = document.createElement('link');
			s.rel = 'stylesheet';
			s.href = src;
			s.async = false;
			s.onload = resolve;
			s.onerror = reject;
			document.head.append(s);
		});
	}
	
	static resource_url(url, prefix) {
		const currentScript = window?.location?.href;
		if (url && url.slice(0, 4).toLowerCase() != 'http') {
			if (prefix) {
				url = prefix + '/' + url;
			}
			if (currentScript) {
				url = new URL(url, currentScript).toString();
			}
		}
		return url;
	}
	
	static async resources(prefix) {
		return Promise.all([
			this.js_resources(prefix),
			this.css_resources(prefix),
		]);
	}
	
	static async js_resources(prefix) {
		let jsAll = Promise.resolve();
		for (let js of this.resource_urls.js) {
			jsAll = jsAll.then(() => {
				return this.jsLoad(
					this.resource_url(js, prefix));
			})
			.catch(err => {
				console.log(js, err);
			});
		}
		return jsAll;
	}
	
	static async css_resources(prefix) {
		let cssAll = Promise.resolve();
		for (let css of this.resource_urls.css) {
			cssAll = cssAll.then(() => {
				return this.cssLoad(
					this.resource_url(css, prefix));
			})
			.catch(err => {
				console.log(css, err);
			});
		}
		return cssAll;
	}
	
	osm_layer() {
		let osm = this.servedTileLayer(
			'base layer (OSM)',
			'https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
			maxZoom: 19,
			attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
		});
		return osm;
	}
	
	bw_layer() {
		return this.servedTileLayer(
			'bw osm',
			'https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}.png', {
			maxZoom: 19,
			attribution: `
				&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a>
				&copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a>
				&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>
			`
		});
	}
	
	makeLayer(layerData) {
		let layer;
		let {type, name, id} = layerData || {};
		switch(type) {
		case 'vector': {
			let {
				sldStyle, style,
				dataProjection,
				extent, features
			} = layerData;
			layer = this.constructor.makeLayerJSON(
				name, id, {sldStyle, style, dataProjection, extent})
			for (let feature of (features || [])) {
				this.constructor.addJSON(layer, feature);
			}
			break;
		};
		case 'tile': {
			let {
				min_zoom, max_zoom, bounds,
				imgSizes, fetchTile,
			} = layerData;
			layer = this.constructor.makeTiledLayer(
				name, id, {min_zoom, max_zoom, bounds, imgSizes, fetchTile});
			break;
		};
		default: {
			return;
		}
		};
		return layer;
	}
	
	addFeature(layerData, feature) {
		if (!layerData.features) {
			layerData.features = [];
		}
		layerData.features.push(feature);
	}
	
	addLayer(layerData) {
		let layer;
		let {type, name, id} = layerData || {};
		switch(type) {
		case 'vector':
		case 'tile': {
			layer = this.makeLayer(layerData);
			break;
		};
		case 'group': {
			let layers = (layerData.layers || [])
				.map(layer => this.makeLayer(layer));
			layer = this.constructor.makeLayerGroup(layers, name, id);
			break;
		};
		default: {
			break;
		}
		};
		if (layer) {
			this._addLayer(layer);
		}
	}
	
	servedTileLayer(title, url, options) {
	}
	
	refresh = () => {}
	
};
