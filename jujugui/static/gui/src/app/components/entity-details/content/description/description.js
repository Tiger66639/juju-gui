/*
This file is part of the Juju GUI, which lets users view and manage Juju
environments within a graphical interface (https://launchpad.net/juju-gui).
Copyright (C) 2017 Canonical Ltd.

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

YUI.add('entity-content-description', function() {

  juju.components.EntityContentDescription = React.createClass({
    displayName: 'EntityContentDescription',

    /* Define and validate the properites available on this component. */
    propTypes: {
      entityModel: React.PropTypes.object,
      renderMarkdown: React.PropTypes.func.isRequired
    },

    render: function() {
      const description = this.props.entityModel.get('description');
      if (!description) {
        return false;
      }
      const htmlDescription = this.props.renderMarkdown(description);
      return (
        <div className="row row--grey entity-content__description">
          <div className="inner-wrapper">
            <div className="twelve-col">
              <div className="intro"
                dangerouslySetInnerHTML={{__html: htmlDescription}}>
              </div>
            </div>
          </div>
        </div>
      );
    }
  });

}, '0.1.0', {
  requires: []
});
