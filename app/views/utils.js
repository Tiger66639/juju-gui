'use strict';

var setConsoleDisabled = (function () {
  'use strict';

  var winConsole = window.console,

    // These are the available methods.
    // Add more to this list if necessary.
    consoleMock = {
      group: function() {},
      groupEnd: function() {},
      groupCollapsed: function() {},
      log:function () {}
    },
    consoleProxy = (function () {

      // This object wraps the "window.console"
      var consoleWrapper = {};

      function buildMethodProxy(key) {
        if (winConsole[key]
          && typeof winConsole[key] === 'function') {
          consoleWrapper[key] = function () {
            var cFunc = winConsole[key];
            cFunc.apply(null, ["llalalalala"]);
          }
        } else {
          consoleWrapper[key] = function () {
            consoleMock[key]();
          }
        }
      }

      // Checking if the browser has the "console" object
      if (winConsole) {

        // Only the methods defined by the consoleMock
        // are available for use.
        for (var key in consoleMock) {
          buildMethodProxy(key);
        }
      }

      return consoleWrapper;
    })();

  // We start the application with a fake console
  if (GlobalConfig.debug) {
    window.console = consoleProxy;

  } else {
    window.console = consoleMock;
  }

  window.console.log('Call "javascript:setConsoleDisabled(false)"' +
    ' to enable the console');

  // In order to enable the console in production the user can
  // call "javascript:setConsoleDisabled(false)" in the address bar
  return function (disabled) {
    if (disabled) {
      window.console = consoleMock;
    } else {
      window.console = consoleProxy;
    }
  };
})();

YUI.add('juju-view-utils', function(Y) {

  var views = Y.namespace('juju.views'),
      utils = Y.namespace('juju.views.utils');

  var timestrings = {
    prefixAgo: null,
    prefixFromNow: null,
    suffixAgo: 'ago',
    suffixFromNow: 'from now',
    seconds: 'less than a minute',
    minute: 'about a minute',
    minutes: '%d minutes',
    hour: 'about an hour',
    hours: 'about %d hours',
    day: 'a day',
    days: '%d days',
    month: 'about a month',
    months: '%d months',
    year: 'about a year',
    years: '%d years',
    wordSeparator: ' ',
    numbers: []
  };

  /*
   * Ported from https://github.com/rmm5t/jquery-timeago.git to YUI
   * w/o the watch/refresh code
   */
  var humanizeTimestamp = function(t) {
    var l = timestrings,
        prefix = l.prefixAgo,
        suffix = l.suffixAgo,
        distanceMillis = Y.Lang.now() - t,
        seconds = Math.abs(distanceMillis) / 1000,
        minutes = seconds / 60,
        hours = minutes / 60,
        days = hours / 24,
        years = days / 365;

    function substitute(stringOrFunction, number) {
      var string = Y.Lang.isFunction(stringOrFunction) ?
          stringOrFunction(number, distanceMillis) : stringOrFunction,
          value = (l.numbers && l.numbers[number]) || number;
      return string.replace(/%d/i, value);
    }

    var words = seconds < 45 && substitute(l.seconds, Math.round(seconds)) ||
        seconds < 90 && substitute(l.minute, 1) ||
        minutes < 45 && substitute(l.minutes, Math.round(minutes)) ||
        minutes < 90 && substitute(l.hour, 1) ||
        hours < 24 && substitute(l.hours, Math.round(hours)) ||
        hours < 42 && substitute(l.day, 1) ||
        days < 30 && substitute(l.days, Math.round(days)) ||
        days < 45 && substitute(l.month, 1) ||
        days < 365 && substitute(l.months, Math.round(days / 30)) ||
        years < 1.5 && substitute(l.year, 1) ||
        substitute(l.years, Math.round(years));

    return Y.Lang.trim([prefix, words, suffix].join(' '));
  };
  views.humanizeTimestamp = humanizeTimestamp;

  Y.Handlebars.registerHelper('humanizeTime', function(text) {
    if (!text || text === undefined) {return '';}
    return new Y.Handlebars.SafeString(humanizeTimestamp(Number(text)));
  });



  var JujuBaseView = Y.Base.create('JujuBaseView', Y.Base, [], {

    bindModelView: function(model) {
      model = model || this.get('model');
      // If this view has a model, bubble model events to the view.
      if (model) {
        model.addTarget(this);
      }

      // If the model gets swapped out, reset targets accordingly.
      this.after('modelChange', function(ev) {
        if (ev.prevVal) {
          ev.prevVal.removeTarget(this);
        }
        if (ev.newVal) {
          ev.newVal.addTarget(this);
        }
      });

      // Re-render this view when the model changes.
      this.after('*:change', this.render, this);
    },

    renderable_charm: function(charm_name, db) {
      var charm = db.charms.getById(charm_name);
      if (charm) {
        return charm.getAttrs();
      }
      return null;
    },

    stateToStyle: function(state, current) {
      // todo also check relations
      var classes;
      switch (state) {
        case 'pending':
          classes = 'state-pending';
          break;
        case 'started':
          classes = 'state-started';
          break;
        case 'start_error':
          classes = 'state-error';
          break;
        case 'install_error':
          classes = 'state-error';
          break;
        default:
          Y.log('Unhandled agent state: ' + state, 'debug');
      }
      classes = current && classes + ' ' + current || classes;
      return classes;
    },

    humanizeNumber: function(n) {
      var units = [[1000, 'K'],
            [1000000, 'M'],
            [1000000000, 'B']],
          result = n;

      Y.each(units, function(sizer) {
        var threshold = sizer[0],
            unit = sizer[1];
        if (n > threshold) {
          result = (n / threshold);
          if (n % threshold !== 0) {
            result = result.toFixed(1);
          }
          result = result + unit;
        }
      });
      return result;
    },

    /*
     * Utility methods for SVG regarding classes
     */
    hasSVGClass: function(selector, class_name) {
      var classes = selector.getAttribute('class');
      return classes.indexOf(class_name) !== -1;
    },

    addSVGClass: function(selector, class_name) {
      if (typeof(selector) === 'string') {
        Y.all(selector).each(function(n) {
          var classes = this.getAttribute('class');
          this.setAttribute('class', classes + ' ' + class_name);
        });
      } else {
        var classes = selector.getAttribute('class');
        selector.setAttribute('class', classes + ' ' + class_name);
      }
    },

    removeSVGClass: function(selector, class_name) {
      if (typeof(selector) === 'string') {
        Y.all(selector).each(function() {
          var classes = this.getAttribute('class');
          this.setAttribute('class', classes.replace(class_name, ''));
        });
      } else {
        var classes = selector.getAttribute('class');
        selector.setAttribute('class', classes.replace(class_name, ''));
      }
    },

    toggleSVGClass: function(selector, class_name) {
      if (this.hasSVGClass(selector, class_name)) {
        this.removeSVGClass(selector, class_name);
      } else {
        this.addSVGClass(selector, class_name);
      }
    }

  });

  views.JujuBaseView = JujuBaseView;

  views.createModalPanel = function(
      body_content, render_target, action_label, action_cb) {
    var panel = new Y.Panel({
      bodyContent: body_content,
      width: 400,
      zIndex: 5,
      centered: true,
      show: false,
      classNames: 'modal',
      modal: true,
      render: render_target,
      buttons: [
        {
          value: action_label,
          section: Y.WidgetStdMod.FOOTER,
          action: action_cb,
          classNames: ['btn-danger', 'btn']
        },
        {
          value: 'Cancel',
          section: Y.WidgetStdMod.FOOTER,
          action: function(e) {
                    e.preventDefault();
                    panel.hide();
          },
          classNames: ['btn']
        }
      ]
    });
    // The default YUI CSS conflicts with the CSS effect we want.
    panel.get('boundingBox').all('.yui3-button').removeClass('yui3-button');
    return panel;
  };

  function _addAlertMessage(container, alertClass, message) {
    var div = container.one('#message-area'),
        errorDiv = div.one('#alert-area');

    if (!errorDiv) {
      errorDiv = Y.Node.create('<div/>')
        .set('id', 'alert-area')
        .addClass('alert')
        .addClass(alertClass);

      Y.Node.create('<span/>')
        .set('id', 'alert-area-text')
        .appendTo(errorDiv);

      var close = Y.Node.create('<a class="close">x</a>');

      errorDiv.appendTo(div);
      close.appendTo(errorDiv);

      close.on('click', function() {
        errorDiv.remove();
      });
    }

    errorDiv.one('#alert-area-text').setHTML(message);
    window.scrollTo(errorDiv.getX(), errorDiv.getY());
  }

  utils.showSuccessMessage = function(container, message) {
    _addAlertMessage(container, 'alert-success', message);
  };

  utils.buildRpcHandler = function(config) {
    var utils = Y.namespace('juju.views.utils'),
        container = config.container,
        scope = config.scope,
        finalizeHandler = config.finalizeHandler,
        successHandler = config.successHandler,
        errorHandler = config.errorHandler;

    function invokeCallback(callback) {
      if (callback) {
        if (scope) {
          callback.apply(scope);
        } else {
          callback();
        }
      }
    }

    return function(ev) {
      if (ev && ev.err) {
        _addAlertMessage(container, 'alert-error', utils.SERVER_ERROR_MESSAGE);
        invokeCallback(errorHandler);
      } else {
        // The usual result of a successful request is a page refresh.
        // Therefore, we need to set this delay in order to show the "success"
        // message after the page page refresh.
        setTimeout(function() {
          utils.showSuccessMessage(container, 'Settings updated');
        }, 1000);

        invokeCallback(successHandler);
      }
      invokeCallback(finalizeHandler);
    };
  };

  utils.SERVER_ERROR_MESSAGE = 'An error ocurred.';

  /*
   * Given a CSS selector, gather up form values and return in a mapping
   * (object).
   */
  utils.getElementsValuesMapping = function(container, selector) {
    var result = {};
    container.all(selector).each(function(el) {
      var value = null;
      if (el.getAttribute('type') === 'checkbox') {
        value = el.get('checked');
      } else {
        value = el.get('value');
      }

      if (value && typeof value === 'string' && value.trim() === '') {
        value = null;
      }

      result[el.get('name')] = value;
    });

    return result;
  };

  /*
   * Given a charm schema, return a template-friendly array describing it.
   */
  utils.extractServiceSettings = function(schema) {
    var settings = [];
    Y.Object.each(schema, function(field_def, field_name) {
      var entry = {
        'name': field_name
      };

      if (schema[field_name].type === 'boolean') {
        entry.isBool = true;

        if (schema[field_name]['default']) {
          // The "checked" string will be used inside an input tag
          // like <input id="id" type="checkbox" checked>
          entry.value = 'checked';
        } else {
          // The output will be <input id="id" type="checkbox">
          entry.value = '';
        }
      } else {
        entry.value = schema[field_name]['default'];
      }

      settings.push(Y.mix(entry, field_def));
    });
    return settings;
  };

  utils.validate = function(values, schema) {
    console.group('view.utils.validate');
    console.log('validating', values, 'against', schema);
    var errors = {};

    function toString(value) {
      if (value === null || value === undefined) {
        return '';
      }
      return (String(value)).trim();
    }

    function isInt(value) {
      return (/^[-+]?[0-9]+$/).test(value);
    }

    function isFloat(value) {
      return (/^[-+]?[0-9]+\.?[0-9]*$|^[0-9]*\.?[0-9]+$/).test(value);
    }

    Y.Object.each(schema, function(field_definition, name) {
      var value = toString(values[name]);
      console.log('validating field', name, 'with value', value);

      if (field_definition.type === 'int') {
        if (!value) {
          if (field_definition['default'] === undefined) {
            errors[name] = 'This field is required.';
          }
        } else if (!isInt(value)) {
          // We don't use parseInt to validate integers because
          // it is far too lenient and the back-end code will generate
          // errors on some of the things it lets through.
          errors[name] = 'The value "' + value + '" is not an integer.';
        }
      } else if (field_definition.type === 'float') {
        if (!value) {
          if (field_definition['default'] === undefined) {
            errors[name] = 'This field is required.';
          }
        } else if (!isFloat(value)) {
          errors[name] = 'The value "' + value + '" is not a float.';
        }
      }

      console.log('generated this error (possibly undefined)', errors[name]);
    });
    console.log('returning', errors);
    console.groupEnd();
    return errors;
  };

}, '0.1.0', {
  requires:
      ['base-build',
       'handlebars',
       'node',
       'view',
       'panel',
       'json-stringify']
});
