Handlebars.registerHelper('table', function(context, cols, options) {
	var ret = '<table class="members-grid members-grid-' + cols + '"><tbody>';

	for(var i = 0; i < context.length; i += cols) {
		ret += '<tr>';
		for(var j = 0; j < cols; j++) {			
			var cardOrMember = context[i + j];			
			if (i + j < context.length) {
				var cardId = cardOrMember.id || cardOrMember.card.id;
				ret += '<td class="members-grid-item" data-card-id="' + cardId + '">' + options.fn(cardOrMember) + '</td>';
			} else {
				ret += '<td>&nbsp;</td>';
			}		
		}
		ret += '</tr>';
	}

	return ret + '</tbody></table>';
});

Handlebars.registerHelper('grid', function(context, options) {
	var cols = 3;
	for (var i = 0; i < context.length; i += cols) {
		ret += '<div class="row">';
		for (var j = 0; j < cols; j++) {			
			ret += options.fn(context);	
		}
		ret += '</div>';
	}

	return ret + '</tbody></table>';
});

Handlebars.registerHelper('loc', function(context, options) {
	var ret = db.dict.messages[context];
	if (_.isUndefined(ret)) {
		ret = context;
	}
	if (options.hash.translate == "true") {
		ret = db.util.toHtmlText(ret);
	}
	return ret;
});

Handlebars.registerHelper('for', function(from, to, incr, options) {
	var ret = '';
	for(var i = from; i <= to; i += incr) {
		ret += options.fn(i);
	}
	return ret;
});

Handlebars.registerHelper('factionImagePath', function(context, options) {
	return db.util.toFactionImageMd(context);
});

Handlebars.registerHelper('factionImagePathLg', function(context, options) {
	return db.util.toFactionImageLg(context);
});

Handlebars.registerHelper('cardImagePath', function(context, options) {
	// cardId or cardImageBase
	var imageBase;
	if (_.isNumber(context)) {
		imageBase = db.dict.findCard(context).imageBase;
	} else {
		imageBase = context;	
	}
	if (options.hash.bloodied == "true") {
		imageBase += "-b";
	}
	return db.util.toCardImage(imageBase);
});

Handlebars.registerHelper('findCard', function(context, options) {
	return db.dict.findCard(context);
});

Handlebars.registerHelper('findCardAttr', function(context, attr, options) {
	return db.dict.findCard(context)[attr];
});

Handlebars.registerHelper('findSet', function(context, options) {
	return db.dict.findSet(context);
});

Handlebars.registerHelper('rootUrl', function(options) {
	return db.static.root;
});

Handlebars.registerHelper('rootUrlClean', function(options) {	
	var root = db.static.root;
	if(root.charAt(root.length - 1) == '/') {
        root = root.substr(0, root.length - 1);
    }
	return root;
});

Handlebars.registerHelper('restUrl', function(options) {
	return db.static.restPath;
});

Handlebars.registerHelper('cardUrl', function(context, options) {
	return db.util.toCardUrl(context);
});

Handlebars.registerHelper('cardRelativeUrl', function(context, options) {
	return db.util.toCardRelativeUrl(context);
});

Handlebars.registerHelper('publicDeckUrl', function(id, name, options) {
	return db.util.toPublicDeckUrl({
		id: id,
		name: name
	});
});

Handlebars.registerHelper('userDeckUrl', function(id, name, options) {
	return db.util.toUserDeckUrl({
		id: id,
		name: name
	});
});

Handlebars.registerHelper('tweetUrl', function(text, options) {
//	var url = '';
//	return ;
});

Handlebars.registerHelper('href', function(context, options) {
	return db.root + '#/' + context;
});

Handlebars.registerHelper('concat', function(c0, c1, c2, c3, c4, options) {
	var ret = '';
	_.each([c0, c1, c2, c3, c4], function(item) {
		if (!_.isUndefined(item)) {
			ret += item;
		}
	});
	return ret;
});

Handlebars.registerHelper('smartIf', function(context, options) {
	if (_.isUndefined(context) || context === null || context === false) {
		return options.inverse(this);
	} else {
		return options.fn(this);
	}
});

Handlebars.registerHelper('smartUnless', function(context, options) {
	if (_.isUndefined(context) || context === null || context === false) {
		return options.fn(this);
	} else {
		return options.inverse(this);
	}
});

Handlebars.registerHelper('ifEqual', function(value0, value1, options) {
	if (value0 === value1) {
		return options.fn(this);
	} else {
		return options.inverse(this);
	}
});

Handlebars.registerHelper('unlessEqual', function(value0, value1, options) {
	if (value0 === value1) {
		return options.inverse(this);
	} else {
		return options.fn(this);
	}
});

Handlebars.registerHelper('markdown', function(context, options) {
	if (_.isUndefined(context)) {
		return null;
	} else {
		return new Markdown.getSanitizingConverter().makeHtml(context);
	}
});

Handlebars.registerHelper('na', function(context, options) {
	if (_.isUndefined(context)) {
		return '&#x25cf;';
	} else {
		return context;
	}
});

Handlebars.registerHelper('searchLinkFaction', function(card, options) {
	return new Handlebars.SafeString(db.util.toSearchLinkFaction(card));
});

Handlebars.registerHelper('searchLinkType', function(card, options) {
	return new Handlebars.SafeString(db.util.toSearchLinkType(card));
});

Handlebars.registerHelper('searchLinkSetName', function(crstTechName, options) {
	var crst = db.dict.findCardSet(crstTechName);
	return new Handlebars.SafeString(db.util.toSearchLinkSetName(crst));
});

Handlebars.registerHelper('searchLinkTraits', function(card, options) {
	return new Handlebars.SafeString(db.util.toSearchLinkTraits(card));
});

Handlebars.registerHelper('searchLinkType', function(card, options) {
	return new Handlebars.SafeString(db.util.toSearchLinkType(card));
});

Handlebars.registerHelper('momentFromNow', function(timestamp, options) {
	return moment.tz(timestamp, db.static.timezone).locale(db.static.language).fromNow();
});

Handlebars.registerHelper('moment', function(timestamp, options) {
	return moment.tz(timestamp, db.static.timezone).locale(db.static.language)
			.format(db.static.format[db.static.language].timestamp);
});

Handlebars.registerHelper('ifSignedIn', function(options) {
	if (db.static.user.username) {
		return options.fn(this);
	} else {
		return options.inverse(this);
	}
});

Handlebars.registerHelper('unlessSignedIn', function(options) {
	if (db.static.user.username) {
		return options.inverse(this);
	} else {
		return options.fn(this);
	}
});

Handlebars.registerHelper('ifUserDeck', function(deck, options) {
	var username = db.static.user.username;
	if (username && username === deck.username) {
		return options.fn(this);
	} else {
		return options.inverse(this);
	}
});

Handlebars.registerHelper('ifPublicSnapshot', function(deck, options) {
	if (deck.snapshotBaseId && deck.snapshotPublic === true) {
		return options.fn(this);
	} else {
		return options.inverse(this);
	}
});

Handlebars.registerHelper('language', function(options) {
	return db.static.language;
});

Handlebars.registerHelper('cardText', function(text, options) {
	if (text) {
		return text.replace('\n', '<br />');
	} else {
		return '';
	}
});

Handlebars.registerHelper('cardTypeToIconClass', function(cardType, options) {
	/*var map = {
		warlord: 'db-icon db-icon-king',
		synapse: 'db-icon db-icon-link',
		army: 'db-icon db-icon-rocket',
		event: 'db-icon db-icon-flash',
		support: 'db-icon db-icon-database',
		attachment: 'db-icon db-icon-attach',
		planet: 'db-icon db-icon-globe',
		token: 'db-icon db-icon-asterisk'
	};*/
	return translateMap['cardTypeIconClass'][cardType];
});

var translateMap = {
	cardTypeIconClass: {
		warlord: 'db-icon db-icon-king',
		synapse: 'db-icon db-icon-link',
		army: 'db-icon db-icon-rocket',
		event: 'db-icon db-icon-flash',
		support: 'db-icon db-icon-database',
		attachment: 'db-icon db-icon-attach',
		planet: 'db-icon db-icon-globe',
		token: 'db-icon db-icon-asterisk'
	},
	tournamentTypeIconClass: {
		worlds: 'glyphicon glyphicon-king',
		nationals: 'glyphicon glyphicon-queen',
		regionals: 'glyphicon glyphicon-tower',
		local: 'glyphicon glyphicon-knight'
	},
	tournamentTypeDisplay: {
		worlds: 'core.tournament.type.worlds',
		nationals: 'core.tournament.type.nationals',
		regionals: 'core.tournament.type.regionals',
		local: 'core.tournament.type.local'
	},
	tournamentPlaceIconClass: {
		'first': 'db-icon db-icon-first',
		'second': 'db-icon db-icon-second'
	},
	tournamentPlaceDisplay: {
		'first': 'core.tournament.place.first',
		'second': 'core.tournament.place.second'
	},
	interestIconClass: {
		'favourite-0': 'db-icon db-icon-heart-empty',
		'favourite-1': 'db-icon db-icon-heart',
		'superb-0': 'db-icon db-icon-star-empty',
		'superb-1': 'db-icon db-icon-star'
	},
	
};

Handlebars.registerHelper('translate', function(value, context, options) {
	if (context == 'interestIconClass') {
		return translateMap[context][options.hash.kind + '-' + value[options.hash.kind]];
	} else {
		return translateMap[context][value];
	}
});

Handlebars.registerHelper('factionColor', function(faction, options) {
	if (faction) {
		return db.util.colors.factions[faction].bg;
	} else {
		return db.util.colors.factions.neutral.bg;
	}
});

Handlebars.registerHelper('factionColorStyle', function(faction, options) {	
	return 'background-color: ' + db.util.colors.factions[faction].bg + ' !important; '
			+ 'color:' + db.util.colors.factions[faction].fg + ' !important;';
});

Handlebars.registerHelper('deckBoxShadowStyle', function(color, options) {	
	var tmpColor = color.replace('#', '');
	var r = parseInt(tmpColor.substr(0, 2), 16);
	var g = parseInt(tmpColor.substr(2, 2), 16);
	var b = parseInt(tmpColor.substr(4, 2), 16);
	return 'box-shadow: 0 0 2px rgba($r,$g,$b,.6), 0 2px 4px rgba($r,$g,$b,.6)'
				.replace(/\$r/g, r).replace(/\$g/g, g).replace(/\$b/g, b);
});

Handlebars.registerHelper('ifRowBegin', function(index, rowMax, max, options) {
	if (index % rowMax == 0) {
		return options.fn(this);
	} else {
		return options.inverse(this);
	}
});

Handlebars.registerHelper('ifRowEnd', function(index, rowMax, max, options) {
	if (index % rowMax == rowMax - 1 || index == max - 1) {
		return options.fn(this);
	} else {
		return options.inverse(this);
	}
});