
import {default as sqlite3InitModule} from './node_modules/@sqlite.org/sqlite-wasm/index.mjs';

import {SQLiteXplorer} from "./lib/sqlitexplorer.js";
let html = `<div id="sqlDiv"></div>`;
document.body.insertAdjacentHTML('beforeend', html);
let div = document.querySelector('div#sqlDiv');
let xplorer = new SQLiteXplorer(div, {});

const demo1 = function(sqlite3, immutable=false) {
	let dbUrl = new URL(
		'./tests/files/dbs/DCTour.gpkg', window.location.href).toString();

	fetch(dbUrl)
	.then(res => res.arrayBuffer())
	.then(arrayBuffer => {
		if (!immutable) {
			arrayBuffer.resizeable = true;
		}
		const p = sqlite3.wasm.allocFromTypedArray(arrayBuffer);
		const db = new sqlite3.oo1.DB();
		let deserialize_flags =
			sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE;
		if (!immutable) {
			deserialize_flags |= sqlite3.capi.SQLITE_DESERIALIZE_RESIZEABLE;
		}
		const rc = sqlite3.capi.sqlite3_deserialize(
			db.pointer, 'main', p, arrayBuffer.byteLength, arrayBuffer.byteLength, deserialize_flags);
		db.checkRc(rc);
		xplorer.setDb(db);
		db.exec("CREATE TABLE IF NOT EXISTS t(a,b)");
	});
};

const log = (...args)=>xplorer.log(...args);
const warn = (...args)=>xplorer.warn(...args);
const error = (...args)=>xplorer.error(...args);

sqlite3InitModule({
	/* We can redirect any stdout/stderr from the module like so, but
		 note that doing so makes use of Emscripten-isms, not
		 well-defined sqlite APIs. */
	print: log,
	printErr: error
}).then(function(sqlite3){
	//console.log('sqlite3 =',sqlite3);
	log("Done initializing. Running demo...");
	try {
		demo1(sqlite3);
	}catch(e){
		error("Exception:",e.message);
	}
});
