// For an introduction to the Blank template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232509
(function () {
    "use strict";

    WinJS.Binding.optimizeBindingReferences = true;
    var app = WinJS.Application;
    var activation = Windows.ApplicationModel.Activation;
    var messageWebSocket, messageWriter, webSocket;
    function $(select) {
        return document.querySelectorAll(select);
    }
    app.onactivated = function (args) {
        var workspace;
        function dologin() {
            var url = "http://169.254.13.0:90/";
            var uname = document.getElementById("login-name").value;
            var pass = document.getElementById("login-pass").value;
            url+="?uname=" + uname + "&pass=" + pass;
            MSApp.execUnsafeLocalFunction(function () {
                document.getElementById("error-div").innerHTML = "<h2>Connecting...</h2>";
            });
            var response;
            WinJS.xhr({ url: url }).then(
            (function (res) {
                response = res.responseText;
                if (response == 0) {
                    MSApp.execUnsafeLocalFunction(function () {
                        document.getElementById("error-div").innerHTML = "<h2>Bad Authentication</h2>";
                    });
                }
                else {
                    MSApp.execUnsafeLocalFunction(function () {
                       workspace = response;
                       document.getElementsByClassName("login")[0].style.display = "none";
                       document.getElementsByClassName("default")[0].style.visibility = "visible";
                    });
                }
            }));
        }
        function log(txt) {
            document.getElementById("console").innerHTML += txt + "<br/>";
        }
        function validateAndCreateUri(uriString) {
            var webSocketUri;
            try {
                webSocketUri = new Windows.Foundation.Uri(uriString);
            } catch (error) {
                return null;
            }
            if (webSocketUri.fragment !== "") {   
                return null;
            }
            return webSocketUri;
        }
        function startSend(mode,param1,param2) {
            if (mode==1 && document.getElementById("chat-txt").value === "") {
                log("Please specify text to send");
                return;
            }
            if (!messageWebSocket) {
                webSocket = new Windows.Networking.Sockets.MessageWebSocket();
                webSocket.control.messageType = Windows.Networking.Sockets.SocketMessageType.utf8;
                webSocket.onmessagereceived = onMessageReceived;
                webSocket.onclosed = onClosed;
                var uri = validateAndCreateUri("ws://169.254.13.0:8080/");
                if (!uri) {
                    return;
                }
                log("Connecting to: " + uri.absoluteUri);
                webSocket.connectAsync(uri).done(function () {
                    WinJS.log && WinJS.log("Connected", "sample", "status");
                    messageWebSocket = webSocket;
                    messageWriter = new Windows.Storage.Streams.DataWriter(webSocket.outputStream);
                    sendMessage(mode,param1,param2);
                }, function (error) {
                    log("Failed to connect: ");
                });
            }
            else {
                log("Already Connected");
                sendMessage(mode,param1,param2);
            }
        }
        function onMessageReceived(args) {
                var dataReader = args.getDataReader();
                var t = dataReader.readString(dataReader.unconsumedBufferLength);
                document.getElementById("error-div").innerHTML = t;
                if (t !== "0") {
                    workspace = t;
                    document.getElementById("login-contents").style.display = "none";
                    document.getElementsByClassName("default")[0].style.visibility= "visible";
                }
            
        }
        function sendMessage(mode,param1,param2) {
            log("Sending message");
            if(mode==1)
                messageWriter.writeString(JSON.stringify({ param: "chat", workspace: param1, data: param2 }));
            else if (mode == 0) {
                messageWriter.writeString(JSON.stringify({ param: "login", uname: param1, pass: param2 }));
            }
            messageWriter.storeAsync().done("", function () {
                log("Error");
            });
        }
        function onClosed(args) {
            log("Closed; Code: " + args.code + " Reason: " + args.reason);
            if (!messageWebSocket) {
                return;
            }

            closeSocketCore();
        }
        function closeSocket() {
            if (!messageWebSocket) {
                WinJS.log && WinJS.log("Not connected", "sample", "status");
                return;
            }

            WinJS.log && WinJS.log("Closing", "sample", "status");
            closeSocketCore(1000, "Closed due to user request.");
        }
        function closeSocketCore(closeCode, closeStatus) {
            if (closeCode && closeStatus) {
                messageWebSocket.close(closeCode, closeStatus);
            } else {
                messageWebSocket.close();
            }

            messageWebSocket = null;

            if (messageWriter) {
                messageWriter.close();
                messageWriter = null;
            }
        }

        if (args.detail.kind === activation.ActivationKind.launch) {
            if (args.detail.previousExecutionState !== activation.ApplicationExecutionState.terminated) {
                // TODO: This application has been newly launched. Initialize
                // your application here.
            } else {
                // TODO: This application has been reactivated from suspension.
                // Restore application state here.
            }
            args.setPromise(WinJS.UI.processAll());
            var open = document.getElementById("file-picker");
            open.addEventListener("click", function () {
                var currentState = Windows.UI.ViewManagement.ApplicationView.value;
                if (currentState === Windows.UI.ViewManagement.ApplicationViewState.snapped &&
                    !Windows.UI.ViewManagement.ApplicationView.tryUnsnap()) {
                    // Fail silently if we can't unsnap
                    return;
                }
                // Create the picker object and set options
                var openPicker = new Windows.Storage.Pickers.FileOpenPicker();
                openPicker.viewMode = Windows.Storage.Pickers.PickerViewMode.list;
                openPicker.suggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.computerFolder;
                openPicker.fileTypeFilter.replaceAll([".js", ".css", ".html", ".txt", ".htm", ".py", ".java", ".rb", ".doc", ".c", ".cpp"]);
                function aba(i, files) {
                    Windows.Storage.FileIO.readTextAsync(files[i]).done(function (contents) {
                        document.getElementsByClassName("file-contents")[i].innerText = contents;
                        console.log(document.getElementsByClassName("CodeMirror").innerHTML);
                    });
                    log("Opening file " + files[i].name);
                    document.getElementById("l" + (i + 1)).innerHTML = files[i].name;
                    document.getElementById("c" + (i + 1)).style.display = "inline-block";
                }
                function set(i) {
                    var tmp = document.getElementsByClassName("file-contents");
                    tmp.innerHTML = "";
                    var labels = document.getElementsByClassName("label");
                    labels[0].innerHTML = "";
                    labels[1].innerHTML = "";
                    labels[2].innerHTML = "";
                    labels[3].innerHTML = "";
                    tmp[0].style.display = "none";
                    tmp[1].style.display = "none";
                    tmp[2].style.display = "none";
                    tmp[3].style.display = "none";
                    if (i == 1) {
                        tmp[0].style.display = "inline-block";
                        tmp[0].style.width = "800px";
                        tmp[0].style.height = "550px";
                    }
                    else if (i == 2) {
                        tmp[0].style.display = "inline-block";
                        tmp[0].style.width = "400px";
                        tmp[0].style.height = "550px";
                        tmp[1].style.display = "inline-block";
                        tmp[1].style.width = "400px";
                        tmp[1].style.height = "550px";
                    }
                    else if (i == 3) {
                        tmp[0].style.display = "inline-block";
                        tmp[0].style.width = "400px";
                        tmp[0].style.height = "260px";
                        tmp[1].style.display = "inline-block";
                        tmp[1].style.width = "400px";
                        tmp[1].style.height = "260px";
                        tmp[2].style.display = "inline-block";
                        tmp[2].style.width = "830px";
                        tmp[2].style.height = "260px";
                    }
                    else {
                        tmp[0].style.display = "inline-block";
                        tmp[0].style.width = "400px";
                        tmp[0].style.height = "260px";
                        tmp[1].style.display = "inline-block";
                        tmp[1].style.width = "400px";
                        tmp[1].style.height = "260px";
                        tmp[2].style.display = "inline-block";
                        tmp[2].style.width = "400px";
                        tmp[2].style.height = "260px";
                        tmp[3].style.display = "inline-block";
                        tmp[3].style.width = "400px";
                        tmp[3].style.height = "260px";
                    }
                }
                // Open the picker for the user to pick a file
                openPicker.pickMultipleFilesAsync().then(function (files) {
                    if (files.size > 0) {
                        var i = files.size;
                        if (i >= 4) i = 3;
                        if (i > 0 && i < 4) {
                            set(files.size);
                        }
                        document.getElementById("c1").style.display = "none";
                        document.getElementById("c2").style.display = "none";
                        document.getElementById("c3").style.display = "none";
                        document.getElementById("c4").style.display = "none";
                        for (i = 0; i < files.size && i < 4; i++) {
                            aba(i, files);

                        }
                    }
                    else {
                        // The picker was dismissed with no selected file

                    }
                });
            });
            var chat = document.getElementById("chat-send");
            var txt = document.getElementById("chat-txt").value;
            txt = encodeURI(txt);
            chat.addEventListener("click", function () {
                startSend(1, workspace, document.getElementById("chat-txt").value);
                document.getElementById("chat-txt").value = "";
            });
            document.getElementById("login-btn").addEventListener("click", function () {
                startSend(0, document.getElementById("login-name").value, document.getElementById("login-pass").value);
            });
        }
        
    };

    app.oncheckpoint = function (args) {
        // TODO: This application is about to be suspended. Save any state
        // that needs to persist across suspensions here. You might use the
        // WinJS.Application.sessionState object, which is automatically
        // saved and restored across suspension. If you need to complete an
        // asynchronous operation before your application is suspended, call
        // args.setPromise().
    };
    app.start();
})();
