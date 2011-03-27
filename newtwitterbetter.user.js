// ==UserScript==
// @name          New Twitter Better
// @namespace     http://jazzychad.net/
// @description   Some tweaks to make New Twitter better
// @include       http://twitter.com/*
// @include       https://twitter.com/*
// ==/UserScript==

var go = function ($, window) {

  var oldSetInterval = window.setInterval;

  var newSetInterval = function (f, t) {
    __log("INTERVAL of " + t);
    __log(f);
    var id = oldSetInterval(f, t);
    return id;
  };
  //window.setInterval = newSetInterval;

  var oldSetTimeout = window.setTimeout;

  var newSetTimeout = function (f, t) {
    __log("TIMEOUT of " + t);
    __log(f);
    var id = oldSetTimeout(f, t);
    return id;
  };
  //window.setTimeout = newSetTimeout;

  function __log(msg) {
    if (window.console && window.console.log) {
      //window.console.log(msg);
    }
  }

  var _newFetchMessages = function () {
    return function (G) {
      var D = this;
      var C = 0;

      function F() {
        C++;
        if (C === 2 && G) {
	  G();
        }
      }
      var A;
      var E = {
        count: 50,
        success: function (H) {
          if (H.length() > 0) {
            __log('got some new messages!!!');
            if (!D.receivedMessages) {
              D.receivedMessages = H
            } else {
              D.receivedMessages.concat(H)
            }
            D.trigger("messagesArrived", [H]);
            D._receivedSinceID = H.first().id;
          }

          A = H;
          F();
        },
        cancel: function () {},
        error: function (I, H) {
          if (I.status === 502) {
	    H.retry();
          }
        }
      };
      if (D._receivedSinceID) {
        E.since_id = D._receivedSinceID;

      }
      __log('checking for new messages');
      twttr.currentUser.receivedMessages(E);
      var B = {
        count: 50,
        success: function (H) {
          if (H.length() > 0) {
            __log('got some new SENT messages!!!');
            if (!D.sentMessages) {
	      D.sentMessages = H;
            } else {
	      D.sentMessages.concat(H);
            }
            //D.trigger("messagesArrived", [H]);
            D.trigger("sentMessagesArrived", [H]);
            D._sentSinceID = H.first().id;
          }
          F();
        },
        cancel: function () {},
        error: function (I, H) {
          if (I.status === 502) {
	    H.retry();
          }
        }
      };
      if (D._sentSinceID) {
        B.since_id = D._sentSinceID;

      }
      twttr.currentUser.sentMessages(B);
    }.apply(twttr.messageManager);
  };

  var newSetupContinuousPoll = function () {
    return function () {
      var B = this;
      if (this._pollId) {
	return;
      }
      this._fetchMessages();
      if (this.threads) {
        this.unbind("messagesArrived");
        A.call(this);
      } else {
        this.one("firstMessagesReceived", function () {
          B.unbind("messagesArrived");
          A.call(B);
        })
      }

      function A() {
        this._pollInterval = 5300;
        this._pollMultiplier = 3;
        this._pollTick = 0;
        this.bind("messagesArrived", function (D, C) {
          C.each(function (E) {
	    B.addMessage(E);

          })
          B._pollMultiplier = 3;
          B._pollTick = 0;
          __log("resetting: " + B._pollTick + ' ' + B._pollMultiplier);
        });
        this.bind("sentMessagesArrived", function (D, C) {
          C.each(function (E) {
	    B.addMessage(E);

          })
          if (B._pollTick < B._pollMultiplier) {
            B._pollMultiplier = 3;
          }
        });
        this._pollId = setInterval((function (C) {
          return function () {

            C._pollTick += 1;
            if (C._pollTick == C._pollMultiplier) {
              C._pollMultiplier += 1;
              C._pollMultiplier = Math.min(C._pollMultiplier, 12);
              C._fetchMessages.apply(B, [function () {
	        C._sort();
              }]);
              __log('fetching messages');
              C._pollTick = 0;
            } else if (C._pollTick > C._pollMultiplier) {
              // should never happen, but want to guard against it.
              C._pollTick = 0;
            } /* end if */
            __log('tick ' + C._pollTick + ' ' + C._pollMultiplier);
          }
        })(B), B._pollInterval);
      }
    }.apply(twttr.messageManager);
  };

  window.addEventListener('load', function () {

    function setup() {

      function addMessagesRefreshButton() {
        if ($('.messages-header').find('.messages-refresh-button').length == 0) {
          __log('adding refresh button...');
          $('.messages-header').find('h1').after('<div class="button messages-refresh-button">Refresh</div>');
          $('.messages-header').find('.messages-refresh-button').css({
            position: "absolute",
            top: "10px",
            right: "110px",
            marginBottom: "10px"
          });
          $('.messages-header').find('.messages-refresh-button').click(function () {
            twttr.messageManager._fetchMessages.apply(twttr.messageManager);
            twttr.showMessage("Refreshing Direct Messages...");
          });
          setTimeout(addMessagesRefreshButton, 1000);
        } else {
          __log('found refresh button, already added!');
        }
      }

      if (window.twttr && window.twttr.components && window.twttr.components.pages && window.twttr.components.pages.Messages) {
        __log('got twttr');


        window.twttr.components.pages.Messages.prototype._onSwitchTo.push(addMessagesRefreshButton);
        window.twttr.showMessage("New Twitter Better - Enabled :)");

      } else {
        __log('trying..');
        window.setTimeout(setup, 2000);
      }

    }

    function setup2() {
      //setup better polling logic for DM's because 90 seconds is an eternity :(
      __log("in setup2");
      if (window.twttr && twttr.messageManager) {
        if (window.twttr.messageManager.setupContinuousPoll == newSetupContinuousPoll) {
          //already setup
          __log("newSetupContinuousPoll already set");
          return;
        }
        __log('got twttr2');
        window.twttr.messageManager.stopContinuousPoll();
        window.twttr.messageManager.setupContinuousPoll = newSetupContinuousPoll;
        window.twttr.messageManager._fetchMessages = _newFetchMessages;
        window.twttr.MessageManager.prototype.setupContinuousPoll = newSetupContinuousPoll;

        
        window.twttr.messageManager.setupContinuousPoll();
      } else {
        __log('trying2..');
        window.setTimeout(setup2, 2000);
      }
    }

    setup();
    setup2();


  });


};

var script = document.createElement('script');
script.setAttribute("type", "application/javascript");
script.textContent = '(' + go + ')(jQuery, window);';
document.body.appendChild(script); // run the script
