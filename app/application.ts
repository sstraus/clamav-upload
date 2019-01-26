import express from "express";
import http = require("http");
import https = require("https");
import multer = require("multer");
import easyxml from "easyxml";
import * as stream from "stream";
import bodyParser = require("body-parser");
import clamav from "clamav.js";

var upload = multer({
  storage: multer.memoryStorage()
});
var serializer = new easyxml({
  singularize: true,
  rootElement: 'response',
  dateFormat: 'ISO',
  manifest: true
});

export class Application {
  private app = express();

  version(): string {
    return "1.0";
  }

  start() {
    console.log("Application Started");
    console.log('Key:' + process.env.KEY);
    this.app.set('x-powered-by', false);
    this.app.set('etag', false);

    this.app.use(function (req, res, next) {
      (<any>res).sendData = function (statusCode: number, obj: any) {
        if (req.accepts('json') || req.accepts('text/html')) {
          res.header('Content-Type', 'application/json');
          res.status(statusCode).send(obj);
        } else if (req.accepts('xml')) {
          res.header('Content-Type', 'text/xml');
          var xml = serializer.render(obj, "");
          res.status(statusCode).send(xml);
        } else {
          res.send(406);
        }
      };
      next();
    });

    this.app.use(function (req, res, next) {
      if (process.env.KEY && req.header("key") != process.env.KEY) {
        next("Access Denied");
      } else
        next();
    });

    this.app.use(function (req, res, next) {
      (<any>res).scan = function (readStream) {
        clamav
          .createScanner(3310, "127.0.0.1")
          .scan(readStream, function (err, object, malicious) {
            if (err) {
              console.log(err);
              next(err);
            } else if (malicious) {
              console.log(malicious + " FOUND");
              (<any>res).sendData(200, { result: "ok", "infected": true, "description": malicious });
            } else {
              console.log("OK");
              (<any>res).sendData(200, { result: "ok", "infected": false });
            }
          });
      }
      next();
    });

    this.app.get("/virus/about", function (req, res, next) {
      console.log('About');
      res.send((<any>res).sendData(200, { result: "ok", "about": "stefano+docker@straus.it" }));
    });

    this.app.get("/virus/get", function (req, res, next) {
    var client =  (req.query.url.toString().indexOf("https") === 0) ? https : http;
        client.get(req.query.url, function (response) {
        const readStream = new stream.Readable();
        response.on('data', function (chunk) {
          readStream.push(chunk);
        }).on('end', function () {
          readStream.push(null);
          (<any>res).scan(readStream);
        });
      }).on('error', function (err) { // Handle errors
        next(err);
      });
    });

    this.app.get("/virus/version", function (req, res, next) {
      clamav.version(3310, '127.0.0.1', 1000, function (err, version) {
        if (err) {
          console.log('Version is not available[' + err + ']');
          next(err);
        }
        else {
          console.log('Version is [' + version + ']');
          res.send((<any>res).sendData(200, { result: "ok", "version": version }));
        }
      })
    });

    this.app.get("/virus/ping", function (req, res, next) {
      clamav.ping(3310, '127.0.0.1', 1000, function (err) {
        if (err) {
          console.log('127.0.0.1:3310 is not available[' + err + ']');
          next(err);
        }
        else {
          console.log('ClamAV is alive');
          res.send((<any>res).sendData(200, { result: "ok", "status": "alive" }));
        }
      })
    });

    this.app.post("/virus/upload/multipart", upload.single("file"), function (
      req,
      res,
      next
    ) {
      const readStream = new stream.Readable();
      readStream.push(req.file.buffer);
      readStream.push(null);
      this.scan(readStream, res, next);
    });

    this.app.use(bodyParser.raw({ type: 'application/octet-stream', limit: '25mb' }))
    this.app.post("/virus/upload/binary", function (
      req,
      res,
      next
    ) {
      const readStream = new stream.Readable();
      readStream.push(req.body);
      readStream.push(null);
      (<any>res).scan(readStream);
    });

    this.app.use(function (err, req, res, next) {
      if (err !== null) {
        console.log(err);
        (<any>res).sendData(500, { result: "fail", error: err.message });
      } else {
        next();
      }
    });

    this.app.listen(3000, function () {
      console.log("Server listening on port 3000");
    });
  }

  stop(): boolean {
    return true;
  }
}
