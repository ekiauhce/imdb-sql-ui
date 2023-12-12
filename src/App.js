import logo from './logo.svg';
import './App.css';

import initSqlJs from 'sql.js';
import { Database } from 'sql.js';
// eslint-disable-next-line import/no-webpack-loader-syntax
import sqlWasm from "!!file-loader?name=sql-wasm-[contenthash].wasm!sql.js/dist/sql-wasm.wasm";
import { useEffect, useState } from 'react';
import _ from 'lodash';


const TABLES = {
  "title.ratings": {
    "tableName": "title_ratings",
    "columns": {
      "tconst": "text primary key",
      "averageRating": "real not null",
      "numVotes": "integer not null",
    }
  }
}

const putDataSet = (datasetName) => (db: Database) => {
  fetch(`/datasets/${datasetName}.tsv.gz`, {cache: "force-cache"})
  .then(resp => resp.blob())
  .then(blob => {
    let ds = new DecompressionStream("gzip");
    return new Response(blob.stream().pipeThrough(ds)).blob();
  })
  .then(blob => blob.text())
  .then(text => {
    let rows = text.trim()
      .split('\n')
      .map(line => line.split('\t'));
    const fieldNames = rows.shift();
    const tableSchema = TABLES[datasetName];
    const tableName = tableSchema["tableName"];
    console.log(`${datasetName} tsv header ${fieldNames}`);
    const func = (fieldName) => {
      return `${fieldName} ${tableSchema["columns"][fieldName]}`
    };
    let q = `
      create table ${tableName} (
        ${fieldNames.map(func).join(',')}
      );
    `;
    console.log(q);
    db.run(q);
    console.log(db.exec(`select * from ${tableName}`));
    const rowMap = (row) => {
      return `(${row.map(x => "?").join(",")})`;
    };

    console.log("Start inserting");
    return Promise.all(_.chunk(rows, 7799).map(async rowsChunk => {
      q = `insert into ${tableName} (${fieldNames.join(",")}) values
        ${rowsChunk.map(rowMap).join(",")};
      `;
      db.run(q, rowsChunk.flatMap(r => r));
    }));
  }).then(x => console.log("Done"));
};


function App() {
  // https://datasets.imdbws.com/title.ratings.tsv.gz

  // const [idb, setIdb] = useState(null);
  const [sqlDb, setSqlDb] = useState(null);

  // useEffect(() => {
  //   const date = new Date();
  //   const version = Math.floor(date.getTime() / (1000 * 60*60*24));
  //   console.log(`Using indexedDb version = ${version} for current date ${date.toISOString()}`);
  //   const openReq = window.indexedDB.open('imdb', 200);
  //   openReq.onerror = (event) => console.error(event);
  //   const storeName = 'title.ratings';
  //   openReq.onupgradeneeded = (event) => {
  //       const db: IDBDatabase = event.target.result;
  //       if (db.objectStoreNames.contains(storeName)) {
  //         console.log(`Delete old object store ${storeName}`);
  //         db.deleteObjectStore(storeName);
  //       }
  //       console.log(`Creating a new object store ${storeName}`);
  //       db.createObjectStore(storeName);
  //   };

  //   openReq.onsuccess = (event) => {
  //     const db = openReq.result;
  //     setIdb(db);
  //     const trx = db.transaction(storeName, 'readonly');
  //     const store = trx.objectStore(storeName);
  //     const getReq = store.get('dataset');
  //     getReq.onsuccess = (event) => {
  //       if (getReq.result) {
  //         console.log(`Store ${storeName} already have dataset`);
  //         console.log(getReq.result);
  //       } else {
  //         console.log(`Adding dataset to the ${storeName} store`);
  //         putDataSet(storeName)(db);
  //       }
  //     };
  //     getReq.onerror = (event) => console.error(event);
  //   }
  // }, []);

  useEffect(() => {
    initSqlJs({ locateFile: () => sqlWasm })
      .then(sqlite => new sqlite.Database())
      .then(db => {
        setSqlDb(db);
        return db;
      })
      .then((db) => {
        putDataSet("title.ratings")(db);
      })
      .catch(err => console.error(err))
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
      <div>
      </div>
    </div>
  );
}

export default App;
