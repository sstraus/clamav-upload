# ClamAV Upload

Antivirus docker with the latest ClamAV exposing an HTTP endpoint

###### [GET] /virus/version

Return the version of the ClamAV engine

{
    "result": "ok",
    "version": "ClamAV 0.101.1/25332/Sat Jan 26 10:28:25 2019"
}

###### [GET] /virus/ping

Return the status of the ClamAV engine

{
    "result": "ok",
    "status": "alive"
}

###### [POST] /virus/upload/binary

Accept a binary uploaded file and return if the file is infected.

{
    "result": "ok",
    "infected": false
}

or

{
    "result": "ok",
    "infected": true,
    "description": "Eicar-Test-Signature"

}

Default response is in JSON format, but you can change to XML setting the <i>accept</i> header to *application/xml*

In case of error, the result is "fail" and error contains the error description

{
    "result": "fail",
    "error": "Malformed Response[UNKNOWN COMMAND]"
}

###### [POST] /virus/upload/multipart

Accept a multipart uploaded file with name "file" and return if the file is infected.

This docker is not build to be publicly exposed to the INTERNET but to offer more protection, you can run the docker with a KEY variable set and provide a header with the same key in the request to authenticate requests.

##### Docker usage:

docker run -p 80:3000 clamav-upload -e KEY="xxxxx"

For any question drop a line to stefano+docker [AT] straus [DOT] it