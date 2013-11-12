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

describe('help dropdown view', function() {

  var views, models, db, landscape, Y, viewNode, envAnno;

  before(function(done) {
    Y = YUI(GlobalConfig).use(['node',
      'juju-landscape',
      'juju-models',
      'juju-views',
      'help-dropdown'], function(Y) {

      views = Y.namespace('juju.views');
      models = Y.namespace('juju.models');

      db = new models.Database();
      landscape = new views.Landscape();
      landscape.set('db', db);

      done();
    });
  });

  beforeEach(function() {
    envAnno = db.environment.get('annotations');
    viewNode = Y.Node.create('<div id="help-dropdown"></div>');
    Y.one('body').append(viewNode);
  });

  afterEach(function() {
    viewNode.remove().destroy(true);
  });

  it('renders the basic list', function() {
    var helpView = new views.HelpDropdownView({
      container: Y.one('#help-dropdown'),
      env: db.environment
    }).render();
    // Landscape url should be hidden
    var container = helpView.get('container');
    assert.equal(
        container.one('.landscape-url').getStyle('display'), 'none');
    assert.equal(container.all('li').size(), 5);
  });

  it('should display the Landscape menu item', function() {
    envAnno['landscape-url'] = 'http://landscape.example.com';
    envAnno['landscape-computers'] = '/computers/criteria/environment:test';
    new views.HelpDropdownView({
      container: Y.one('#help-dropdown'),
      env: db.environment
    }).render();

    assert.equal(
        viewNode.one('.landscape-url').getStyle('display'), 'list-item');
    assert.equal(
        viewNode.one('.landscape-url a').get('href'),
        'http://landscape.example.com/computers/criteria/environment:test/');
  });

  it('can start the onboarding visualization', function(done) {
    var resetCalled = 0,
        renderCalled = 0;
    var helpView = new views.HelpDropdownView({
      container: Y.one('#help-dropdown'),
      env: db.environment,
      onboarding: {
        reset: function() { resetCalled = 1; },
        render: function() {
          assert.equal(resetCalled, 1, 'Onboarding reset not called');
          done();
        }
      }
    });
    helpView.render();
    var ob = helpView.get('container').one('.start-onboarding');
    ob.simulate('click');
  });
});
