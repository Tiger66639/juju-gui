'use strict';

(function() {

  describe('juju charm view', function() {
    var CharmView, juju, localCharmStore, testUtils, Y, env, conn, container;

    var charmQuery = '/charms/precise/postgresql/json';

    var charmResults = {
      maintainer: 'Mark Mims <mark.mims@canonical.com>',
      series: 'precise',
      owner: 'charmers',
      provides: {
        'db - admin': {
          'interface': 'pgsql'
        },
        db: {
          'interface': 'pgsql'
        }
      },
      config:
          { options:
                { option0:
                      { description: 'The first option.',
                        type: 'string'},
                  option1:
                      { description: 'The second option.',
                        type: 'boolean'},
                  option2:
                      { description: 'The third option.',
                        type: 'boolean'}}},
      description: 'PostgreSQL is a fully featured RDBMS.',
      name: 'postgresql',
      summary: 'object-relational SQL database (supported version)',
      bzr_branch: 'lp:~charmers/charms/precise/postgresql/trunk',
      last_change:
          { committer: 'David Owen <david.owen@canonical.com>',
            message: 'Only reload for pg_hba updates',
            revno: 24,
            created: 1340206387.539},
      proof: {}};

    before(function(done) {
      Y = YUI(GlobalConfig).use([
        'juju-views', 'juju-tests-utils', 'juju-env',
        'node-event-simulate'
      ], function(Y) {
        container = Y.Node.create('<div id="test-container" />');
        Y.one('#main').append(container);
        testUtils = Y.namespace('juju-tests.utils');
        juju = Y.namespace('juju');
        CharmView = juju.views.charm;
        // Use a local charm store.
        localCharmStore = new Y.DataSource.Local({
          source: [{
            responseText: Y.JSON.stringify(charmResults)
          }]
        });
        conn = new testUtils.SocketStub();
        env = new juju.Environment({conn: conn});
        env.connect();
        conn.open();

        done();
      });
    });


    after(function(done) {
      env.destroy();
      done();
    });

    // Ensure the charm view correctly requests a charm deploy.
    it('should be able to deploy a charm', function(done) {
      // Create an instance of CharmView passing a customized env.
      var view = new CharmView({
        charm_data_url: charmQuery,
        charm_store: localCharmStore,
        env: env
      });
      assert.equal(true, false);
      var redirected = false;
      view.on('showEnvironment', function() {
        redirected = true;
      });
      var deployInput = view.get('container').one('#charm-deploy');
      deployInput.after('click', function() {
        var msg = conn.last_message();
        // Ensure the websocket received the `deploy` message.
        msg.op.should.equal('deploy');
        var expected = charmResults.series + '/' + charmResults.name;
        msg.charm_url.should.contain(expected);
        // A click to the deploy button redirects to the root page.
        redirected.should.equal(true);
        done();
      });
      assert.equal(true, false);
      // XXX This doesn't work:
      // deployInput.simulate('click');
      // So we do this instead:
      view.on_charm_deploy();

      var msg = conn.last_message();
      // Ensure the websocket received the `deploy` message.
      msg.op.should.equal('deploy');
      var expected = charmResults.series + '/' + charmResults.name;
      msg.charm_url.should.contain(expected);
      // A click to the deploy button redirects to the root page.
      redirected.should.equal(true);
      redirected.should.equal(false);
      done();
    });

    it('should allow for the user to specify a service name', function(done) {
      var charmView = new CharmView(
          { charm_data_url: charmQuery,
            charm_store: localCharmStore,
            container: container,
            env: env
          }).render();
      var serviceName = 'my custom service name';
      var deployButton = container.one('#charm-deploy');
      // Assertions are in a callback, so set them up first.
      deployButton.after('click', function() {
        var msg = conn.last_message();
        // Ensure the websocket received the `deploy` message.
        assert.equal(msg.op, 'deploy');
        assert.equal(msg.service_name, serviceName);
        assert.equal(msg.config, {});
        assert.equal(true, false);
        done();
      });
      container.one('#service-name').set('value', serviceName);
      deployButton.simulate('click');
    });

  });

})();
