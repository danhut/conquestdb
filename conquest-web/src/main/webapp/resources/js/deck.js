var conquest = conquest || {};
conquest.deck = conquest.deck || {};

(function(_deck) {

	$.ajaxPrefilter(function(options, originalOptions, jqXHR) {
		options.url = conquest.static.restPath + options.url + '?language=' + conquest.static.language;
		if (options.data) {
			options.data = options.data.replace(/%5B%5D/g, '');
		}
	});

	_deck.buildErrorMessage = function(options) {
		var error = options.error || {};
		return messages = {
			kind: 'danger',
			title: 'core.error',
			message: error.message ? error.message : options.message,
			context: error.timestamp ? ('timestamp: ' + error.timestamp) : undefined
		};
	};

	_deck.buildSuccessMessage = function(options) {
		return messages = {
			kind: 'success',
			title: 'core.ok',
			message: options.message,
		};
	};

	_deck.renderMessages = function(options) {
		if (options.messages) {

			var messages = [];
			if (_.isArray(options.messages)) {
				messages = options.messages;
			} else {
				messages.push(options.messages);
			}

			var $template = $(Handlebars.templates['global-messages.hbs']({
				messages: messages
			}));

			options.$target.prepend($template);			
						
			var hasDangerKind = _.some(messages, function(message) {
				return message.kind == 'danger';
			});

			var hideDelay = options.hideDelay || (hasDangerKind ? 5000 : 2000);
			if (hideDelay > -1) {
				setTimeout(function() {
					$template.fadeOut("slow");
				}, hideDelay);
			}
		}
	};

	_deck.showMessageModalDialog = function(options) {

		var $modal = $('#messageModal');
		if ($modal.length > 0) {
			$modal.data('bs.modal', null);
		}
		$modal = $(Handlebars.templates['deck-message-modal.hbs'](options));

		if (options.buttonYes && options.buttonYes.handler) {
			$modal.find('#messageButtonYes').click(options.buttonYes.handler);
		}
		if (options.buttonNo && options.buttonNo.handler) {
			$modal.find('#messageButtonNo').click(options.buttonNo.handler);
		}

		$modal.modal();
	};

	_deck.prepareExportModalDialog = function(deck, options) {

		var $modal = $('#exportModal');
		if ($modal.length == 0) {
			$modal = $(Handlebars.templates['deck-export-modal.hbs']());
		}

		$modal.on('shown.bs.modal', function() {
			$modal.find('a').click(function(e) {
				e.preventDefault();
				$(this).tab('show');
			});

			var GK = 'group-key';
			var SK = 'sort-key';
			$modal.data(GK, $modal.data(GK) || 'typeDisplay');
			$modal.data(SK, $modal.data(SK) || 'name');

			var renderData = function(initial) {
				var link = {};
				if (deck.get('snapshotBaseId') && deck.get('snapshotPublic') === true) {
					link.key = 'core.checkOutDeckAt';
					link.value = /^(?:http:\/\/)?([^?]+).*/.exec(document.URL)[1];
				} else {
					link.key = 'core.createdWith';
					link.value = /^(?:http:\/\/)?([^/?]+).*/.exec(document.URL)[1];
				}
				var membersGroups = conquest.util.membersGroupBy(deck.get('members'), $modal.data(GK), $modal.data(SK));
				var plainData = Handlebars.templates['deck-export-plain.hbs']({
					warlord: deck.get('warlord'),
					membersGroups: membersGroups,
					includeSetName: $modal.data(GK) == 'setName' ? false : true,
					link: link
				});
				$modal.find('#exportPlain textarea').val($.trim(plainData));
				var bbCodeData = Handlebars.templates['deck-export-bbcode.hbs']({
					warlord: deck.get('warlord'),
					membersGroups: membersGroups,
					includeSetName: $modal.data(GK) == 'setName' ? false : true,
					link: link
				});
				$modal.find('#exportBBCode textarea').val(bbCodeData);
				if (initial === true) {
					var backupJson = deck.getBackupJson();
					delete backupJson.links;
					delete backupJson.snapshots;
					var backupText = JSON.stringify({
						deck: backupJson
					});
					$modal.find('#exportBackup textarea').val(backupText);
				}
			};

			$modal.find('.mg-control-group label[data-group-key="' + $modal.data(GK) + '"]').addClass('active');
			$modal.find('.mg-control-group label').click(function() {
				$(this).addClass('active').siblings().removeClass('active');
				$modal.data(GK, $(this).data(GK));
				renderData(false);
			});
			$modal.find('.mg-control-sort label[data-sort-key="' + $modal.data(SK) + '"]').addClass('active');
			$modal.find('.mg-control-sort label').click(function() {
				$(this).addClass('active').siblings().removeClass('active');
				$modal.data(SK, $(this).data(SK));
				renderData(false);
			});
			$modal.on('hidden.bs.modal', function() {

			});

			var client = new ZeroClipboard($modal.find('#exportCopyAndCloseButton')[0]);
			client.on('ready', function(readyEvent) {
				client.on('copy', function(event) {
					var clipboard = event.clipboardData;
					clipboard.setData('text/plain', $('.tab-pane.active textarea').val());
				});
			});

			renderData(true);
		});

		$('.export-copy-to-clipboard').click(function() {
			$modal.modal();
		});
	};

	_deck.showDeckDescriptionModal = function(deck, options) {
		var $modal = $('#deckDescriptionModal');
		if ($modal.length > 0) {
			$modal.data('bs.modal', null);
		}
		$modal = $(Handlebars.templates['deck-description-modal.hbs']({
			deck: deck,
			title: options.title,
			button: options.button
		}));
		new _deck.DeckDescriptionView({
			el: $modal.find('.deck-description-view')
		}).render(deck);

		if (options.button.clickHandler) {
			$modal.find('#' + options.button.id).click(function() {
				options.button.clickHandler($modal, $modal.find('#deckName').val().trim(), $modal.find('#deckDescription').val().trim());
			});
		}

		$modal.modal();
	};

	_deck.showDeckSaveCopyModal = function(deck, options) {

		var saveCopy = function($modal, name, description) {
			var attributes = {
				name: name,
				description: description,
				type: 'base'
			};

			var copy = deck.getBackupJson();
			delete copy.id;
			delete copy.name;
			delete copy.description;
			delete copy.snapshotBaseId;

			var copy = new conquest.model.PrivateDeck(copy, {
				parse: true
			});

			copy.listenToOnce(copy, 'invalid', function(copy) {
				conquest.deck.renderMessages({
					$target: $modal.find('.modal-body'),
					messages: buildErrorMessage({
						message: copy.validationError
					})
				});
			});

			copy.save(attributes, {
				success: function(published, response, options) {
					// conquest.saveDeck(copy);
					conquest.deck.renderMessages({
						$target: $modal.find('.modal-body'),
						messages: _deck.buildSuccessMessage({
							message: 'ok.deck.oper.save'
						})
					});
					options.deck.get('snapshots').unshift(published);
				},
				error: function(published, response, options) {
					conquest.deck.renderMessages({
						$target: $modal.find('.modal-body'),
						messages: _deck.buildErrorMessage({
							error: response.responseJSON,
							message: 'error.deck.oper.save'
						})
					});
				}
			});
		};

		_deck.showDeckDescriptionModal(deck, {
			title: 'core.saveDeckCopy',
			button: {
				id: 'deckSaveCopyButton',
				glyphiconClass: 'glyphicon-save',
				btnClass: 'btn-success',
				title: 'core.saveCopy',
				clickHandler: saveCopy
			}
		});
	};

	_deck.factionColors = [];
	_deck.factionColors['chaos'] = {
		base: '#F1764F',
		hl: 'rgba(241, 118, 79, 0.8)'
	};
	_deck.factionColors['astra-militarum'] = {
		base: '#979797',
		hl: 'rgba(151, 151, 151, 0.8)'
	};
	_deck.factionColors['ork'] = {
		base: '#7AA264',
		hl: 'rgba(122, 162, 100, 0.8)'
	};
	_deck.factionColors['space-marines'] = {
		base: '#90A9EB',
		hl: 'rgba(144, 169, 235, 0.8)'
	};
	_deck.factionColors['tau'] = {
		base: '#90E6EE',
		hl: 'rgba(144, 230, 238, 0.8)'
	};
	_deck.factionColors['eldar'] = {
		base: '#EBE19C',
		hl: 'rgba(235, 225, 156, 0.8)'
	};
	_deck.factionColors['dark-eldar'] = {
		base: '#B48EAD',
		hl: 'rgba(180, 142, 173, 0.8)'
	};
	_deck.factionColors['neutral'] = {
		base: '#DDD',
		hl: 'rgba(221, 221, 221, 0.8)'
	};

	_deck.typeColors = [];
	_deck.typeColors['army'] = {
		base: '#F04747',
		hl: 'rgba(240, 71, 71, 0.8)'
	};
	_deck.typeColors['attachment'] = {
		base: '#419441',
		hl: 'rgba(65, 148, 65, 0.8)'
	};
	_deck.typeColors['support'] = {
		base: '#3B84CC',
		hl: 'rgba(59, 132, 204, 0.8)'
	};
	_deck.typeColors['event'] = {
		base: '#F0AD36',
		hl: 'rgba(240, 173, 54, 0.8)'
	};

	_deck.PageView = Backbone.View.extend({
		el: '.content',
		renderMessages: function(options) {
			_deck.renderMessages({
				$target: this.$el,
				messages: this.messages
			});
			delete this.messages;
		},
		viewLinkClickHandler: function(event) {
			var root = conquest.static.root;
			var href = $(event.currentTarget).attr('href');
			if (href && href.indexOf(root) == 0 && !event.ctrlKey && !event.shiftKey) {
				event.preventDefault();
				conquest.router.navigate(href.replace(conquest.static.root, ''), {
					trigger: true
				});
			}
		},
		nonViewLinkClickHandler: function(event) {
			var data = event.data;
			if (data && data.deck) {
				if (data.deck.history.length > 0) {
					event.preventDefault();

					var href = this.href;
					var options = {
						titleKey: 'core.deck.aboutToLeave.title',
						messageKey: 'core.deck.aboutToLeave.message',
						buttonYes: {
							labelKey: 'core.yes.long' + Math.floor(Math.random() * 2),
							class: 'btn-danger',
							handler: function() {
								window.location.href = href;
							}
						},
						buttonNo: {}
					};
					showMessageModalDialog(options);
				}
			}
		},
		bindMenuLinkClickHandler: function() {
			$('.navbar a').on('click', {
				deck: this.deck
			}, this.nonViewLinkClickHandler);
		},
		unbindMenuLinkClickHandler: function() {
			$('.navbar a').off('click');
		}
	});

	_deck.MemberGroupsView = Backbone.View.extend({
		el: '.mg-container',
		render: function(members) {
			var view = this;
			if (_.isUndefined(view.groupKey)) {
				view.groupKey = 'typeDisplay';
			}
			if (_.isUndefined(view.sortKey)) {
				view.sortKey = 'name';
			}

			var groups = conquest.util.membersGroupBy(members, view.groupKey, view.sortKey);

			view.$el.html(Handlebars.templates['members-groups.hbs']({
				membersGroups: groups
			}));

			view.$el.find('.mg-control-group label[data-group-key="' + view.groupKey + '"]').addClass('active');
			view.$el.find('.mg-control-group label').click(function() {
				$(this).addClass('active').siblings().removeClass('active');
				view.groupKey = $(this).data('group-key');
				view.render(members);
			});
			view.$el.find('.mg-control-sort label[data-sort-key="' + view.sortKey + '"]').addClass('active');
			view.$el.find('.mg-control-sort label').click(function() {
				$(this).addClass('active').siblings().removeClass('active');
				view.sortKey = $(this).data('sort-key');
				view.render(members);
			});

			view.$el.find('a[data-image-base]').popover({
				html: true,
				trigger: 'hover',
				content: function() {
					return conquest.util.writeCardImgElem($(this).data('image-base'), {
						class: 'card-md'
					});
				}
			});
		}
	});

	_deck.DeckDescriptionView = Backbone.View.extend({
		el: '.deck-description-view',
		render: function(deck) {
			var view = this;

			var template = Handlebars.templates['deck-description-view.hbs']({
				deck: deck.toJSON()
			});
			view.$el.html(template);
			var markdown = new Markdown.getSanitizingConverter();
			view.$el.find('#deckName').on('keyup', function() {
				view.$el.find('#deckNamePreview').empty().html(markdown.makeHtml($(this).val()));
			});
			view.$el.find('#deckDescription').on('keyup', function() {
				view.$el.find('#deckDescriptionPreview').empty().html(markdown.makeHtml($(this).val()));
			});
		}
	});

	_deck.DeckCommentsView = Backbone.View.extend({
		el: '.deck-comments-view',
		render: function(deck, parentView) {
			var view = this;

			var addComment = function(comment, $ul) {
				$(Handlebars.templates['deck-comment.hbs']({
					comment: comment.toJSON()
				})).appendTo($ul).find('[data-toggle="tooltip"]').tooltip({
					container: 'body'
				});
			};

			var $template = $(Handlebars.templates['deck-comments-view.hbs']({
				deck: deck.toJSON()
			}));
			deck.get('comments').each(function(comment) {
				addComment(comment, $template.find('ul'));
			});
			
			view.$el.html($template);

			view.$el.find('#deckCommentPostButton').click(function() {				
				var attributes = {
					value: view.$el.find('#deckCommentTextarea').val()
				};
				
				var deckComment = new conquest.model.DeckComment();
				deckComment.listenToOnce(deckComment, 'invalid', function(dc) {
					parentView.messages = _deck.buildErrorMessage({
						message: dc.validationError
					});
					parentView.renderMessages();					
				});
				deckComment.owner = deck.get('comments').owner;
				deckComment.save(attributes, {
					success: function(deckComment, response, options) {
						parentView.messages = _deck.buildSuccessMessage({
							message: 'ok.deck.oper.saveComment'
						});
						parentView.renderMessages();
						deck.get('comments').add(deckComment);
						addComment(deckComment, $template.find('ul'));
						view.$el.find('#deckCommentTextarea').val('');
					},
					error: function(deckComment, response, options) {
						parentView.messages = _deck.buildErrorMessage({
							error: response.responseJSON,
							message: 'error.deck.oper.saveComment'
						});
						parentView.renderMessages();						
					}
				});
			});			
		}
	});

	_deck.MemberListView = Backbone.View.extend({
		el: '.members-list-container',
		render: function(members, options) {
			var templateName = undefined;
			if (options.layout === 'grid-2') {
				templateName = 'deck-members-grid-2.hbs';
			} else if (options.layout === 'grid-3') {
				templateName = 'deck-members-grid-3.hbs';
			} else if (options.layout === 'grid-4') {
				templateName = 'deck-members-grid-4.hbs';
			} else if (options.layout === 'grid-6') {
				templateName = 'deck-members-grid-6.hbs';
			} else {
				// list layout is the default
				templateName = 'deck-members-list.hbs';
			}

			var template = Handlebars.templates[templateName]({
				members: members.toJSON(),
				readOnly: options.readOnly
			});
			this.$el.html(template);

			var $members = this.$el.find('.members-grid-item:not(:disabled), .members-list-item:not(:disabled)');
			$members.each(function() {
				var $member = $(this);
				var $buttons = $member.find('.btn-group-qty .btn');
				var member = members.models[$members.index($member)];
				var $active = $buttons.eq(member.get('quantity')).addClass('active');
				if (member.get('fixedQuantity') === true) {
					$active.siblings().attr('disabled', 'disabled');
				}

				$buttons.click(function() {
					var $button = $(this);
					$button.addClass('active').siblings().removeClass('active');
					member.set({
						quantity: parseInt($button.text())
					});
				});
			});

			this.$el.find('[data-toggle="tooltip"]').tooltip({
				container: 'body'
			});
			this.$el.find('a[data-image-base]').popover({
				html: true,
				trigger: 'hover',
				content: function() {
					return conquest.util.writeCardImgElem($(this).data('image-base'), {
						class: 'card-md'
					});
				}
			});
		}
	});

	_deck.DeckListFilterView = Backbone.View.extend({
		el: '.deck-list-filter-container',
		initialize: function(options) {
			this.config = options.config;
			this.state = new Backbone.Model({
				advanced: false
			});
		},		
		buildFilterFromUI: function() {
			var filter = {};
			filter.primaryFaction = this.$el.find('.btn-group-filter.filter-faction.primary .btn.active').map(function() {
				return $(this).data('faction');
			}).get();
			filter.secondaryFaction = this.$el.find('.btn-group-filter.filter-faction.secondary .btn.active').map(function() {
				return $(this).data('faction');
			}).get();
			filter.warlordTechName = this.$el.find('#warlordFilter li[data-node-type="warlord"] > input[type="checkbox"]:checked').map(function() {
				return $(this).val();
			}).get();
			filter.setTechName = this.$el.find('#cardSetFilter li[data-node-type="set"] > input[type="checkbox"]:checked').map(function() {
				return $(this).val();
			}).get();
			filter.setMatchMode = this.$el.find('#setMatchMode input[type="radio"]:checked').val();
			if (filter.setMatchMode === 'subset') {
				filter.setSkipCoreSetOnly = this.$el.find('#setMatchMode input[type="checkbox"]:checked').length === 1;
			}
			filter.createDateMin = this.$el.find('#createDateFilter input:eq(0)').val();
			filter.createDateMax = this.$el.find('#createDateFilter input:eq(1)').val();
			filter.modifyDateMin = this.$el.find('#modifyDateFilter input:eq(0)').val();
			filter.modifyDateMax = this.$el.find('#modifyDateFilter input:eq(1)').val();
			
			var $publishDateFilter = this.$el.find('#publishDateFilter');
			filter.publishDateMin = $publishDateFilter.find('input:eq(0)').val();
			filter.publishDateMax = $publishDateFilter.find('input:eq(1)').val();

			filter.username = this.$el.find('#usernameFilter input').val();

			filter.order = this.$el.find('.deck-sort-container .sort-control').map(function() {
				return  $(this).val();
			}).get();

			_.each(Object.keys(filter), function(key) {
				var value = filter[key];
				if (_.isString(value)) {
					value = $.trim(value);
				}
				if ((_.isObject(value) || _.isString(value)) && _.isEmpty(value)) {
					delete filter[key];
				}
			});

			return filter;
		},
		applyFilterToUI: function(filter) {
			this.$el.find('.btn-group-filter.filter-faction.primary .btn').each(function() {
				var $this = $(this);
				if (filter.primaryFaction && filter.primaryFaction.indexOf($this.data('faction')) > -1) {
					$this.addClass('active');
				}
			});
			this.$el.find('.btn-group-filter.filter-faction.secondary .btn').each(function() {
				var $this = $(this);
				if (filter.secondaryFaction && filter.secondaryFaction.indexOf($this.data('faction')) > -1) {
					$this.addClass('active');
				}
			});
			this.$el.find('#cardSetFilter li[data-node-type="set"] > input[type="checkbox"]').each(function() {
				var $this = $(this);
				$this.prop('checked', filter.setTechName && filter.setTechName.indexOf($this.val()) > -1);
			});
			this.$el.find('#warlordFilter li[data-node-type="warlord"] > input[type="checkbox"]').each(function() {
				var $this = $(this);
				$this.prop('checked', filter.warlordTechName && filter.warlordTechName.indexOf($this.val()) > -1);
			});
			if (filter.createDateMin) {
				this.$el.find('#createDateFilter input:eq(0)').val(filter.createDateMin);
			}
			if (filter.createDateMax) {
				this.$el.find('#createDateFilter input:eq(1)').val(filter.createDateMax);
			}
			if (filter.modifyDateMin) {
				this.$el.find('#modifyDateFilter input:eq(0)').val(filter.modifyDateMin);
			}
			if (filter.modifyDateMax) {
				this.$el.find('#modifyDateFilter input:eq(1)').val(filter.modifyDateMax);
			}
			if (filter.publishDateMin) {
				this.$el.find('#publishDateFilter input:eq(0)').val(filter.publishDateMin);
			}
			if (filter.publishDateMax) {
				this.$el.find('#publishDateFilter input:eq(1)').val(filter.publishDateMax);
			}
			if (filter.username) {
				this.$el.find('#usernameFilter input:eq(1)').val(filter.username);
			}

			if (!_.isEmpty(filter.order)) {
				this.$el.find('.deck-sort-container .sort-control').each(function(index) {
					if (filter.order[index]) {
						$(this).val(filter.order[index]);
					}
				});
			}
		},
		render: function(options) {
			var view = this;
			
			options = options || {};
			options.filter = options.filter || {};

			view.state.set({
				advanced: _.isBoolean(options.advanced) ? options.advanced : view.advanced
			});

			var template = Handlebars.templates['deck-list-filter-view.hbs']({
				advanced: view.state.get('advanced'),
				config: view.config || {},
				factions: _.filter(conquest.dict.factions, function(faction) {
					return faction.techName != 'neutral';
				})
			});
			view.$el.html(template);
			view.$el.find('.input-daterange').datepicker({
				autoclose: true,
				format: 'yyyy-mm-dd',
				language: conquest.static.language,
				todayHighlight: true
			});
			view.$el.find('#moreButton').click(function() {
				var filter = view.buildFilterFromUI();
				view.render({
					advanced: true,
					searchClickHandler: options.searchClickHandler
				});
				view.applyFilterToUI(filter);				
			});
			view.$el.find('#lessButton').click(function() {
				var filter = view.buildFilterFromUI();
				view.render({
					advanced: false,
					searchClickHandler: options.searchClickHandler
				});
				view.applyFilterToUI(filter);
			});
			view.$el.find('#clearButton').click(function() {
				view.$el.find('.btn-group-filter.filter-faction .btn').removeClass('active');
				view.$el.find('input[type="text"]').val('');
				view.$el.find('input[type="checkbox"]').prop('checked', '');				
				view.$el.find('select').prop('selectedIndex', 0)
			});

			var cardSetFilterTemplate = Handlebars.templates['commons-ul-tree.hbs']({
				tree: conquest.dict.buildCardSetTree()
			});
			view.$el.find('#cardSetFilter').html(cardSetFilterTemplate);
			view.$el.find('#cardSetFilter li[data-node-type="cycle"] > input[type="checkbox"]').click(function() {
				var $this = $(this);
				$this.siblings().filter('ul').find('li[data-node-type="set"] > input[type="checkbox"]').prop('checked', $this.prop('checked'));
			});

			var warlordFilterTemplate = Handlebars.templates['commons-ul-tree.hbs']({
				tree: conquest.dict.buildWarlordTree()
			});
			view.$el.find('#warlordFilter').html(warlordFilterTemplate);

			var sortTemplate = Handlebars.templates['deck-sort-select.hbs']({
				sortItems: view.config.sortItems
			});
			var $container = view.$el.find('.deck-sort-container');
			$container.append(sortTemplate);
			$container.append(sortTemplate);
			$container.append(sortTemplate);
			// $container.find('.dropdown').each(function() {
			// 	var $dropdown = $(this);
			// 	$dropdown.find('.sort-asc, .sort-desc').click(function() {
			// 		var $this = $(this);
			// 		if ($this.hasClass('sort-asc')) {
			// 			$dropdown.find('button > span:eq(0)').removeClass('glyphicon-sort glyphicon-sort-by-attributes-alt').addClass('glyphicon-sort-by-attributes');
			// 		} else {
			// 			$dropdown.find('button > span:eq(0)').removeClass('glyphicon-sort glyphicon-sort-by-attributes').addClass('glyphicon-sort-by-attributes-alt');
			// 		}
			// 	});
			// });

			view.applyFilterToUI(options.filter);

			//
			// click handlers
			//
			view.$el.find('.btn-group.select-many > .btn').click(function(event) {
				var $this = $(this);
				if (event.ctrlKey) {
					$this.addClass('active').siblings().removeClass('active');
				} else {
					$this.toggleClass('active');
				}
			});

			// //
			// // date range filter
			// //
			// view.$el.find('.btn-group-date-range .btn').click(function() {
			// 	var $this = $(this);				
			// 	$(this).toggleClass('active').siblings().removeClass('active');
			// 	if ($this.hasClass('active')) {
			// 		var range = $this.data('date-range');
			// 		var filter = $this.closest('.date-range-filter');
			// 	}
			// });

			if (options.searchClickHandler) {
				view.$el.find('#searchButton').click(function() {
					options.searchClickHandler();
				});
			}

			//
			// tooltips
			//				
			view.$el.find('[data-toggle="tooltip"]').tooltip({
				container: 'body'
			});
		}
	});

	_deck.DeckListDataView = Backbone.View.extend({
		el: '.deck-list-data-container',
		render: function(decks, options) {
			var view = this;

			var deckWrappers = [];
			decks.each(function(deck) {
				var stats = deck.computeStats();
				stats.cost.name = 'card.cost.sh';
				stats.shield.name = 'card.shieldIcons.sh';
				stats.command.name = 'card.commandIcons.sh';
				stats.attack.name = 'card.attack.sh';
				stats.hitPoints.name = 'card.hp.sh';

				deckWrappers.push({
					deck: deck.toJSON(),
					membersGroups: conquest.util.membersGroupBy(deck.get('members'), 'typeDisplay', 'name'),
					totalQuantity: deck.computeTotalQuantity.call(deck),
					totalCost: deck.computeTotalCost.call(deck),
					stats: stats,
					published: deck.get('snapshotBaseId') && deck.get('snapshotPublic') === true
				});
			});

			var pagination = undefined;
			var total = decks.config.get('total');
			var pageNumber = decks.config.get('pageNumber');
			var pageSize = decks.config.get('pageSize');
			if (_.isNumber(total) && _.isNumber(pageNumber) && _.isNumber(pageSize) && total / pageSize > 1) {
				var lastPageNumber = Math.ceil(total / pageSize);
				pagination = {
					prevPage: pageNumber > 1 ? {
						number: pageNumber - 1
					} : undefined,
					nextPage: pageNumber < lastPageNumber ? {
						number: pageNumber + 1
					} : undefined,
					pages: []
				};
				_.each(_.range(1, lastPageNumber + 1), function(number) {
					pagination.pages.push({
						number: number,
						active: number == pageNumber
					});
				});
			}
			var template = Handlebars.templates['deck-list-data-view.hbs']({
				deckWrappers: deckWrappers,
				pagination: pagination,

			});
			view.$el.html(template);

			var chartOptions = {
				animation: false,
				segmentShowStroke: false,
				segmentStrokeWidth: 2,
				tooltipFontSize: 12
			};

			//
			// factions chart
			//
			view.$el.find('.chart-container.factions').each(function() {
				var deck = decks.findWhere({
					id: parseInt($(this).data('deck-id'))
				});
				var members = conquest.util.toJSON(deck.get('members').filter(function(member) {
					return member.get('quantity') > 0;
				}));
				var byFaction = _.groupBy(members, function(member) {
					return member.card.faction;
				});

				var dataByFaction = [];
				var sortedKeys = _.sortBy(Object.keys(byFaction), function(key) {
					if (key == deck.get('warlord').faction) {
						return 0;
					} else if (key == 'neutral') {
						return 2;
					} else {
						return 1;
					}
				});
				_.each(sortedKeys, function(key) {
					dataByFaction.push({
						label: conquest.dict.findFaction(key).shortName,
						value: _.reduce(byFaction[key], function(count, member) {
							return count + member.quantity;
						}, 0),
						color: conquest.deck.factionColors[key].base,
						highlight: conquest.deck.factionColors[key].hl
					});
				});

				var chart = new Chart($(this).find('.chart')[0].getContext('2d')).Doughnut(dataByFaction, chartOptions);
				$(this).find('.legend').html(chart.generateLegend());
			});

			//
			// card types chart
			//
			view.$el.find('.chart-container.types').each(function() {
				var deck = decks.findWhere({
					id: parseInt($(this).data('deck-id'))
				});
				var members = conquest.util.toJSON(deck.get('members').filter(function(member) {
					return member.get('quantity') > 0;
				}));
				var byType = _.groupBy(members, function(member) {
					return member.card.type;
				});

				var order = ['army', 'attachment', 'support', 'event'];
				var dataByType = [];
				_.each(Object.keys(byType), function(key) {
					dataByType[order.indexOf(key)] = {
						label: conquest.dict.findCardType(key).shortName,
						value: _.reduce(byType[key], function(count, member) {
							return count + member.quantity;
						}, 0),
						color: conquest.deck.typeColors[key].base,
						highlight: conquest.deck.typeColors[key].hl
					};
				});

				var chart = new Chart($(this).find('.chart')[0].getContext('2d')).Doughnut(dataByType, chartOptions);
				$(this).find('.legend').html(chart.generateLegend());
			});

			//
			// click handlers
			//
			view.$el.find('.expand-toggle').click(function() {
				$(this).toggleClass('active').parents('.deck-container').find('.members').toggleClass('hidden');
			});
			view.$el.find('.pagination-container a[data-page-number]').click(function(event) {
				if (options.pageClickHandler) {
					options.pageClickHandler(parseInt($(this).data("page-number")));
				}
				event.preventDefault();
			});

			//
			// tooltips
			//				
			view.$el.find('[data-toggle="tooltip"]').tooltip({
				container: 'body'
			});
		}
	});

	_deck.createTypeahead = function(members, view) {
		// constructs the suggestion engine
		var cards = new Bloodhound({
			datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
			queryTokenizer: Bloodhound.tokenizers.whitespace,
			local: $.map(members, function(member) {
				return {
					name: member.card.name,
					card: member.card
				};
			})
		});

		var traits = new Bloodhound({
			datumTokenizer: Bloodhound.tokenizers.obj.whitespace('description'),
			queryTokenizer: Bloodhound.tokenizers.whitespace,
			local: conquest.dict.traits
		});

		var keywords = new Bloodhound({
			datumTokenizer: Bloodhound.tokenizers.obj.whitespace('description'),
			queryTokenizer: Bloodhound.tokenizers.whitespace,
			local: conquest.dict.keywords
		});

		cards.initialize();
		traits.initialize();
		keywords.initialize();

		var $typeahead = $('#search').typeahead({
			hint: true,
			highlight: true,
			minLength: 1
		}, {
			name: 'cards',
			displayKey: 'name',
			source: cards.ttAdapter(),
			templates: {
				suggestion: Handlebars.compile('{{name}}&nbsp;<span class="tt-no-highlight">{{card.setName}} | {{card.factionDisplay}} | {{card.typeDisplay}} | {{card.trait}}</span>'),
				header: '<div class="tt-multi-header">' + conquest.dict.messages['core.card'] + '</div>'
			}
		}, {
			name: 'traits',
			displayKey: 'description',
			source: traits.ttAdapter(),
			templates: {
				header: '<div class="tt-multi-header">' + conquest.dict.messages['core.trait'] + '</div>'
			}
		}, {
			name: 'keywords',
			displayKey: 'description',
			source: keywords.ttAdapter(),
			templates: {
				header: '<div class="tt-multi-header">' + conquest.dict.messages['core.keyword'] + '</div>'
			}
		});

		$typeahead.on('typeahead:selected', function($event, suggestion, dataset) {
			console.log('selected' + $event);
			view.searchbar = {
				suggestion: suggestion,
				dataset: dataset
			};
		}).on('typeahead:autocompleted', function($event, suggestion, dataset) {
			console.log('autocompleted' + $event);
			view.searchbar = {
				suggestion: suggestion,
				dataset: dataset
			};
		}).on('typeahead:closed', function($event) {
			console.log('closed' + $event);
			view.searchbar.text = $('#search').typeahead('val');
		}).on('typeahead:opened', function($event) {
			console.log('opened' + $event);
			view.searchbar = {};
		}).on('keyup', function($event) {
			if ($event.keyCode == 13) {
				$('#search').typeahead('close');
				//				filter();
			}
		});
	};

})(conquest.deck);