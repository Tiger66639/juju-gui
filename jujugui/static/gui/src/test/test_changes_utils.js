/*
This file is part of the Juju GUI, which lets users view and manage Juju
environments within a graphical interface (https://launchpad.net/juju-gui).
Copyright (C) 2012-2013 Canonical Ltd.

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU Affero General Public License version 3, as published by
the Free Software Foundation.

This program is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranties of MERCHANTABILITY,
SATISFACTORY QUALITY, or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero
General Public License for more details.

You should have received a copy of the GNU Affero General Public License along
with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

'use strict';


describe('ChangesUtils', function() {
  var db, ECS, ecs, models, changesUtils, Y;

  before(function(done) {
    var requirements = [
      'changes-utils',
      'environment-change-set',
      'juju-models',
      'node'
    ];
    Y = YUI(GlobalConfig).use(requirements, function(Y) {
      models = Y.namespace('juju.models');
      ECS = Y.namespace('juju').EnvironmentChangeSet;
      changesUtils = window.juju.utils.ChangesUtils;
      done();
    });
  });

  beforeEach(function() {
    db = new models.Database();
    ecs = new ECS({db: db});
  });

  afterEach(function() {
    window.clearTimeout(ecs.descriptionTimer);
    ecs.destroy();
  });

  // Add a service and a unit to the given database.
  var addEntities = function(db) {
    db.services.add({
      id: 'django', charm: 'cs:trusty/django-1', icon: 'django.svg'});
    db.addUnits({id: 'django/0'});
  };

  describe('getServiceByUnitId', function() {
    it('returns the service', function() {
      addEntities(db);
      var service = changesUtils.getServiceByUnitId('django/0',
          db.services, db.units);
      assert.strictEqual(service.get('id'), 'django');
    });

    it('raises an error if the service is not found', function() {
      assert.throw(function() {
        changesUtils.getServiceByUnitId('no-such/42', db.services, db.units);
      }, 'unit no-such/42 not found');
    });
  });

  it('can convert relation endpoints to their real names', function() {
    var services = new Y.ModelList();
    var args = [
      ['wordpress', {
        name: 'db',
        role: 'server'
      }],
      ['84882221$', {
        name: 'db',
        role: 'client'
      }],
      function() {}
    ];
    services.add([
      { id: 'foobar' },
      { id: '84882221$', displayName: '(mysql)' },
      { id: 'wordpress', displayName: 'wordpress' }
    ]);
    var services = changesUtils.getRealRelationEndpointNames(args, services);
    assert.deepEqual(services, ['mysql', 'wordpress']);
  });

  it('can generate descriptions for any change type', function() {
    addEntities(db);
    var tests = [{
      icon: 'django.svg',
      msg: ' cs:trusty/django-1 has been added to the controller.',
      change: {
        command: {
          method: '_addCharm',
          args: ['cs:trusty/django-1', 'cookies are better'],
          options: {applicationId: 'django'}
        }
      }
    }, {
      icon: 'django.svg',
      msg: ' django resources added.',
      change: {
        command: {
          method: '_addPendingResources',
          args: [{applicationName: 'django', charmURL: 'cs:trusty/django-1'}]
        }
      }
    }, {
      icon: 'django.svg',
      msg: ' django has been added to the model.',
      change: {
        command: {
          method: '_deploy',
          args: ['cs:trusty/django-1', 'django'],
          options: {modelId: 'django'}
        }
      },
      time: '12:34 PM'
    }, {
      icon: 'changes-units-added',
      msg: ' 1 django unit has been added.',
      change: {
        command: {
          method: '_add_unit',
          args: ['django', 1],
          options: {modelId: 'django/0'}
        }
      }
    }, {
      icon: 'changes-units-removed',
      msg: '1 unit has been removed from foo',
      change: {
        command: {
          method: '_remove_units',
          args: [['foo/0']]
        }
      }
    }, {
      // Note that this case is never used in production code.
      // We always add a single unit to a service.
      icon: 'changes-units-added',
      msg: ' 2 django units have been added.',
      change: {
        command: {
          method: '_add_unit',
          args: ['django', 2],
          options: {modelId: 'django/0'}
        }
      }
    }, {
      icon: 'changes-relation-added',
      msg: 'bar relation added between foo and baz.',
      change: {
        command: {
          method: '_add_relation',
          args: [
            ['foo', { name: 'bar' }],
            ['baz']
          ]
        }
      }
    }, {
      icon: 'changes-container-created',
      msg: '1 container has been added.',
      change: {
        command: {
          method: '_addMachines',
          args: [[{ parentId: 1 }]]
        }
      }
    }, {
      icon: 'changes-container-created',
      msg: '2 containers have been added.',
      change: {
        command: {
          method: '_addMachines',
          args: [[{ parentId: 1 }, { parentId: 1 }]]
        }
      }
    }, {
      icon: 'changes-machine-created',
      msg: '1 machine has been added.',
      change: {
        command: {
          method: '_addMachines',
          args: [[{}]]
        }
      }
    }, {
      icon: 'changes-machine-created',
      msg: '2 machines have been added.',
      change: {
        command: {
          method: '_addMachines',
          args: [[{}, {}]]
        }
      }
    }, {
      icon: 'changes-config-changed',
      msg: 'Configuration values changed for django.',
      change: {
        command: {
          method: '_set_config',
          args: ['django']
        }
      }
    }, {
      icon: 'changes-unknown',
      msg: 'An unknown change has been made to this enviroment via the CLI.',
      change: {
        command: {
          method: '_anUnknownMethod'
        }
      }
    }];
    // This method needs to be stubbed out for the add relation path.
    var endpointNames = sinon.stub(
        changesUtils, 'getRealRelationEndpointNames').returns(['foo', 'baz']);
    this._cleanups.push(endpointNames.restore);
    tests.forEach(function(test) {
      var change = changesUtils.generateChangeDescription(
          db.services, db.units, test.change, true);
      assert.equal(change.icon, test.icon);
      assert.equal(change.description, test.msg);
      if (test.timestamp) {
        assert.equal(change.time, test.time);
      } else {
        assert.equal(change.time, '-');
      }
    });
  });

  it('can generate descriptions for all the changes in the ecs', function() {
    var stubDescription = sinon.stub(
        changesUtils,
        'generateChangeDescription');
    this._cleanups.push(stubDescription.restore);
    ecs.changeSet = { foo: { index: 0 }, bar: { index: 0 } };
    changesUtils.generateAllChangeDescriptions(
        db.services, db.units, ecs.changeSet);
    assert.equal(stubDescription.callCount, 2);
  });

  it('can get the counts of each type of ecs change', function() {
    var changeSet = {
      one: {command: {method: 'addMachine'}},
      two: {command: {method: 'addUnit'}},
      three: {command: {method: 'addMachine'}}
    };
    assert.deepEqual(changesUtils.getChangeCounts(changeSet), {
      addMachine: 2,
      addUnit: 1,
      total: 3
    });
  });

  it('can group the ecs change by type', function() {
    var changeSet = {
      one: {command: {method: 'addMachine'}},
      two: {command: {method: 'addUnit'}},
      three: {command: {method: 'addMachine'}}
    };
    assert.deepEqual(changesUtils.getGroupedChanges(changeSet), {
      addUnit: {
        two: {command: {method: 'addUnit'}}
      },
      addMachine: {
        one: {command: {method: 'addMachine'}},
        three: {command: {method: 'addMachine'}}
      }
    });
  });

  it('can filter the changeset by parent', function() {
    var changeSet = {
      one: {parents: ['parent1']},
      two: {parents: ['parent2']},
      three: {parents: ['parent1', 'parent2']}
    };
    assert.deepEqual(changesUtils.filterByParent(changeSet, 'parent1'), {
      one: {parents: ['parent1']},
      three: {parents: ['parent1', 'parent2']}
    });
  });
});
