		
		
// See: https://lea.verou.me/2020/07/import-non-esm-libraries-in-es-modules,-with-client-side-vanilla-js/

async function require(path) {
  let _module = window.module;
  window.module = {};
  await import(path);
  let exports = module.exports;
  window.module = _module;
  return exports;
}


/*(async () => { // top-level await cannot come soon enough…

let parse = await require("https://cdn.jsdelivr.net/gh/reworkcss/css@latest/lib/parse/index.js");

let update = () => {
  let css = document.querySelector("style").textContent;
  console.log(JSON.stringify(parse(css), null, "\t"));
}
update();

})();*/


	import {DisplayDriver} from "./lib/map_show_leaflet.js";
	//import {DisplayDriver} from "./lib/map_show_ol.js";
	await DisplayDriver.resources(window.location.href, 'lib');
	
	import {SQLiteXplorer} from "./lib/sqlitexplorer.js";
	let html = `<div id="sqlDiv"></div>`;
	document.body.insertAdjacentHTML('beforeend', html);
	let div = document.querySelector('div#sqlDiv');
	window.xplorer = new SQLiteXplorer(div, {
		build_map: DisplayDriver,
		mapParams: [],
		withProj4JS: true,
	});
	window.map = window.xplorer.getMap();
	window.map._addLayer(
		window.map.
		bw_layer()
		//osm_layer()
	);
	window.log = window.xplorer.log;

import SPL from './node_modules/spl.js/dist/spl-web.js';

const autoGeoJSON = window.autoGeoJSON || {
	precision: 15,
	options: 2,
};

let spl = await SPL(
	{
		autoGeoJSON,
	},
	[],
);

let autogpkg = 1;
let withgpkg = true;

const projdbUrl = new URL(
	'./node_modules/spl.js/dist/proj/proj.db', window.location.href).toString();
let projData = await fetch(projdbUrl)
	.then(resp => resp.arrayBuffer());

spl.mount('/proj', [{name: 'proj.db', data: projData}]);

let dbUrl = new URL(
	'./tests/files/dbs/DCTour.gpkg', window.location.href).toString();
let dbData = await fetch(dbUrl)
	.then(resp => resp.arrayBuffer());

let splDb = await spl.db(dbData)
	.read(`
		--nga gpkg have these hacks
		drop view if exists spatial_ref_sys;
		drop view if exists st_spatial_ref_sys;
		drop view if exists geometry_columns;
		drop view if exists st_geometry_columns;
	`)
	.read(init_spl())
	;

window.xplorer.setDb(splDb);

function init_spl(projFile='/proj/proj.db') {
	let pragmas = `
		PRAGMA foreign_keys = 1;
		PRAGMA recursive_triggers = 1;`;
	let init = `
		SELECT initspatialmetadatafull(1)
		where not exists (
			SELECT 1
			FROM sqlite_schema
			WHERE name LIKE 'geometry_columns'
		)
		;
		SELECT PROJ_SetDatabasePath('${projFile}'); -- set proj.db path
		`;
	let gpkg = `
		/**/
		SELECT EnableGpkgAmphibiousMode()
		WHERE getgpkgmode()=0;
		SELECT enablegpkgmode()
		WHERE GetGpkgAmphibiousMode()=0;
		/**/
		SELECT
			AutoGPKGStart(),
			--AutoGPKGStop(),
			''
		WHERE EXISTS (
			SELECT 1
			FROM sqlite_schema
			WHERE name LIKE 'gpkg_contents'
		)
		and ${autogpkg}=1
		`;
	if (!withgpkg) {
		gpkg = '';
	}
	return pragmas + init + gpkg;
}
