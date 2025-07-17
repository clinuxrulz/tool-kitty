import { err, ok, Result } from "../kitty-demo/Result";

export class Storage {
  db: IDBDatabase;

  private constructor(db: IDBDatabase) {
    this.db = db;
  }

  static init(): Promise<Result<Storage>> {
    return new Promise<Result<Storage>>((resolve) => {
      let dbOpenRequest = window.indexedDB.open("pixel-editor", 1);
      dbOpenRequest.onerror = () => {
        resolve(err("Failed to load database."));
      };
      dbOpenRequest.onupgradeneeded = () => {
        var db = dbOpenRequest.result;
        if (!db.objectStoreNames.contains("previous_work")) {
          db.createObjectStore("previous_work");
        }
      };
      dbOpenRequest.onsuccess = () => {
        let db = dbOpenRequest.result;
        resolve(ok(new Storage(db)));
      };
    });
  }

  loadPreviousWork(): Promise<Result<Blob | undefined>> {
    return new Promise<Result<Blob | undefined>>((resolve) => {
      let transaction = this.db.transaction("previous_work", "readwrite");
      let cursor = transaction.objectStore("previous_work").get("image");
      cursor.onerror = (e) => {
        resolve(err("Failed to load previous work."));
      };
      cursor.onsuccess = (e) => {
        let imgFile = cursor.result;
        if (imgFile == null) {
          // there was no previous work
          resolve(ok(undefined));
          return;
        }
        resolve(ok(imgFile));
      };
    });
  }

  saveWork(imgFile: Blob): Promise<Result<{}>> {
    return new Promise<Result<{}>>((resolve) => {
      let cursor = this.db
        .transaction("previous_work", "readwrite")
        .objectStore("previous_work")
        .put(imgFile, "image");
      cursor.onerror = () => {
        resolve(err("Failed to save work."));
      };
      cursor.onsuccess = () => {
        resolve(ok({}));
      };
    });
  }
}

/*
// This works on all devices/browsers, and uses IndexedDBShim as a final fallback 
var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;

// Open (or create) the database
var open = indexedDB.open("MyDatabase", 1);

// Create the schema
open.onupgradeneeded = function() {
    var db = open.result;
    var store = db.createObjectStore("MyObjectStore", {keyPath: "id"});
    var index = store.createIndex("NameIndex", ["name.last", "name.first"]);
};

open.onsuccess = function() {
    // Start a new transaction
    var db = open.result;
    var tx = db.transaction("MyObjectStore", "readwrite");
    var store = tx.objectStore("MyObjectStore");
    var index = store.index("NameIndex");

    // Add some data
    store.put({id: 12345, name: {first: "John", last: "Doe"}, age: 42});
    store.put({id: 67890, name: {first: "Bob", last: "Smith"}, age: 35});
    
    // Query the data
    var getJohn = store.get(12345);
    var getBob = index.get(["Smith", "Bob"]);

    getJohn.onsuccess = function() {
        console.log(getJohn.result.name.first);  // => "John"
    };

    getBob.onsuccess = function() {
        console.log(getBob.result.name.first);   // => "Bob"
    };

    // Close the db when the transaction is done
    tx.oncomplete = function() {
        db.close();
    };
}
*/
