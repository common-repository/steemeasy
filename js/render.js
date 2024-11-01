var Render = (function() {
	/* Private */
	var _img = function(src, width, height) {
		var img = document.createElement('img');
		img.setAttribute('src', src);
		return img;
	};
	var _li = function() {
		var li = document.createElement('li');
		return li;
	};
	var _div = function(cssClass, html) {
		var el = document.createElement('div');
		el.classList.add(cssClass);
		if (html !== undefined) el.innerHTML = html;
		return el;
	};
	var _btn = function(cssClass, text) {
		var b = document.createElement('button');
		var t = _div('btnIcon', text);
		var c = _div('btnCount', '0');
		t.innerHTML = text;
		b.appendChild(t);
		b.appendChild(c);
		b.classList.add(cssClass);
		return b;
	};
	var _replyBtn = function(cssClass, text) {
		var b = document.createElement('button');
		b.innerHTML = text;
		b.classList.add(cssClass);
		return b;
	};
	var _replyImoBtn = function(code, title, src) {
		var b = document.createElement('button');
		b.classList.add('replyImoticonButton');
		b.classList.add('button');
		b.setAttribute('data-code', code);
		b.setAttribute('data-src', src);
		b.innerHTML = title;
		return b;
	};
	var _createRow = function(key, link, comment, author, reward, vote, created, declinePayout, isSteemGazua) {
		var row = _div('pRow');
		var pTitle = _div('pTitle');
		var pAuthor = _div('pAuthor');
		var pReward = _div('pReward');
		var pVote = _div('pVote');
		var pCreated = _div('pCreated');

		link.classList.add('postLink');
		link.setAttribute('data-key', key);
		pTitle.appendChild(link);
		if (comment > 0) {
			var co = Render.createLink('[' + comment + ']', '#'); // Comment
			co.classList.add('commentLink');
			pTitle.appendChild(co);
		}
		if (isSteemGazua) {
			var gazuaOriginal = document.createElement('span');
			gazuaOriginal.className = 'gazuaOriginal';
			gazuaOriginal.innerHTML = '♥';
			gazuaOriginal.title = 'Steemeasy Beneficiary Applied';
			pTitle.appendChild(gazuaOriginal);
		}
		pAuthor.innerHTML = author;
		pReward.innerHTML = reward;
		pVote.innerHTML = vote;

		if (declinePayout) {
			pReward.classList.add('strikethrough');
		}

		var tooltipDate = document.createElement('div');
		tooltipDate.innerHTML = created.localeDate().mmdd();
		tooltipDate.className = 'createdDate';
		tooltipDate.setAttribute('title', created.localeDate().toLocaleDateString(Config.dateLocale, Config.dateOptions));
		pCreated.appendChild(tooltipDate);

		row.appendChild(pTitle);
		row.appendChild(pAuthor);
		row.appendChild(pReward);
		row.appendChild(pVote);
		row.appendChild(pCreated);

		return row;
	};
	var _lastPost = {'permlink': '', 'author': ''};
	var _commentVote = function(commentAuthor, commentPermlink, upvoteComment) {

		steem.api.getActiveVotes(commentAuthor, commentPermlink, function(err, votes) {
			if (err === null) {
				var v = Helper.countVotes(votes);
				upvoteComment.querySelector('.btnCount').innerHTML = v.up;
				steem.api.getContent(commentAuthor, commentPermlink, function(err, result) {
					if (err === null) {
						var payout = Helper.getPayout(result);
						upvoteComment.querySelector('.btnCount').innerHTML = upvoteComment.querySelector('.btnCount').innerHTML + '/' + payout;
					}
				});

				// Logged In User Already Voted Mark
				if (window.isAuth) {
					var voted = Vote.hasVoted(votes, username);
					if (voted === 1) {
						upvoteComment.classList.add('voted');
					} else if (voted === -1) {
						//downvoteComment.classList.add('voted');
					}
				}
			}
		});
	};
	var _replies = function(parentAuthor, parentPermlink, parentDepth, callback) {
		steem.api.getContentReplies(parentAuthor, parentPermlink, function(err, result) {
			if (err === null) {
				var r = _div('replies');
				var i, len = result.length;
				for (i = 0; i < len; i++) {
					var reply = result[i];

					// Skip Blacklisted Account
					if (Config.blackAccounts.indexOf(reply.author) !== -1) {
						continue;
					}

					var container = _div('reply');
					var author = _div('replyAuthor', reply.author);
					var created = _div('replyCreated', (new Date(reply.created)).localeDate().toLocaleDateString(Config.dateLocale, Config.dateOptions));
					var upvoteComment = _btn('upvoteComment', '↑');
					var replyComment = _replyBtn('replyButton', 'Reply');
					var body = _div('replyBody', Helper.markdown2html(reply.body));
					var childrenWrap = _div('childrenWrap');
					Vote.commentVoteBind(upvoteComment);
					container.setAttribute('data-author', reply.author);
					container.setAttribute('data-permlink', reply.permlink);
					container.appendChild(author);
					container.appendChild(created);
					container.appendChild(upvoteComment);
					container.appendChild(replyComment);
					container.appendChild(body);
					container.appendChild(childrenWrap);
					r.appendChild(container);
					_commentVote(reply.author, reply.permlink, upvoteComment);
					_openReplyCommentForm(replyComment, reply.author, reply.permlink);

					if (reply.children > 0) {
						var child = _btn('child', '⨁');
						var childrenWrap = container.querySelector('.childrenWrap');
						child.querySelector('.btnCount').innerHTML = reply.children;
						childrenWrap.setAttribute('data-author', reply.author);
						childrenWrap.setAttribute('data-permlink', reply.permlink);
						childrenWrap.setAttribute('data-depth', reply.depth);
						container.appendChild(child);
						_openChildren(child, childrenWrap);
					}
				}
				callback({err: null, el: r});
			} else {
				console.error('getContentReplies ERROR:', err);
				callback({err: err, el: null});
			}
		});
	};
	var _openChildren = function(expandButton, childrenWrap) {
		expandButton.addEventListener('click', function(e) {
			var parentAuthor = childrenWrap.getAttribute('data-author');
			var parentPermlink = childrenWrap.getAttribute('data-permlink');
			var parentDepth = childrenWrap.getAttribute('data-depth');

			expandButton.setAttribute('disabled', true);
			_replies(parentAuthor, parentPermlink, parentDepth, function(result) {
				if (result.err === null) {
					expandButton.style.display = 'none';
					if (result.el != null) {
						childrenWrap.appendChild(result.el);
					}
				} else {
					expandButton.removeAttribute('disabled');
				}
			});
		});
	};

	var _openReplyCommentForm = function(btn, author, permlink) {
		btn.setAttribute('data-author', author);
		btn.setAttribute('data-permlink', permlink);
		var btnClick = btn.addEventListener('click', function() {
			if (window.isAuth !== true) {
				alert('Login required');
				return;
			}
			btn.setAttribute('disabled', true);
			btn.removeEventListener('click', btnClick);
			var author = btn.getAttribute('data-author');
			var permlink = btn.getAttribute('data-permlink');
			var replyContainer = _div('replyContainer', '');
			var replyTextArea = document.createElement('textarea');
			var replyPreview = document.createElement('div');
			var replyImoticonButtons = document.createElement('div');
			var replySubmit = document.createElement('button');
			var replyCancel = document.createElement('button');

			replySubmit.classList.add('button');
			replySubmit.textContent = 'Submit';
			replyCancel.classList.add('button');
			replyCancel.textContent = 'Cancel';
			replyTextArea.setAttribute('placeholder', 'Input Comment');
			replyTextArea.classList.add('replyInput');
			replyPreview.className = 'replyPreview';
			replyImoticonButtons.className = 'replyImoticonButtons';

			replyContainer.appendChild(replyTextArea);
			replyContainer.appendChild(replyPreview);
			replyContainer.appendChild(replyImoticonButtons);
			replyContainer.appendChild(replySubmit);
			replyContainer.appendChild(replyCancel);
			btn.parentNode.appendChild(replyContainer);

			Render.replyImoticons(replyImoticonButtons);

			var cancelClick = replyCancel.addEventListener('click', function() {
				btn.removeAttribute('disabled');
				replyContainer.parentNode.removeChild(replyContainer);
			});
			var submitClick = replySubmit.addEventListener('click', function() {
				var parentReply = replySubmit.parentNode.parentNode;
				var parentAuthor = parentReply.getAttribute('data-author');
				var parentPermlink = parentReply.getAttribute('data-permlink');
				var rePermlink = 're-' + parentPermlink + '-' + Math.floor(Date.now() / 1000);
				var inputString = replyTextArea.value.trim();

				if (inputString === '') {
					alert('Empty comment');
				} else {
					replyTextArea.setAttribute('disabled', true);
					replyCancel.setAttribute('disabled', true);
					replySubmit.setAttribute('disabled', true);

					var metaData = {
						"tags": [Config.steemTag],
						"app": Config.app,
						"format": "markdown"
					};
					broadcastComment(parentAuthor, parentPermlink, username, inputString, metaData, function(result) {
						console.log('broadcastComment:', parentAuthor, parentPermlink, username, inputString, metaData, result);
						btn.removeAttribute('disabled');
						replyContainer.parentNode.removeChild(replyContainer);

						var replyElement = btn.parentNode;
						var parentChildrenWrap = replyElement.querySelector('.childrenWrap');
						var container = _div('reply', '');
						var author = _div('replyAuthor', username);
						var created = _div('replyCreated', (new Date()).toLocaleDateString(Config.dateLocale, Config.dateOptions));
						var upvoteComment = _btn('upvoteComment', '↑');
						var downvoteComment = _btn('downvoteComment', '😩');
						var replyComment = _replyBtn('replyButton', 'Reply');
						var body = _div('replyBody', Helper.markdown2html(inputString));
						var childrenWrap = _div('childrenWrap', '');

						Vote.commentVoteBind(upvoteComment);
						//Vote.commentVoteBind(downvoteComment);
						container.setAttribute('data-author', username);
						container.setAttribute('data-permlink', rePermlink);
						container.appendChild(author);
						container.appendChild(created);
						container.appendChild(upvoteComment);
						//container.appendChild(downvoteComment);
						container.appendChild(replyComment);
						container.appendChild(body);
						container.appendChild(childrenWrap);
						parentChildrenWrap.appendChild(container);

						_openReplyCommentForm(replyComment, username, rePermlink);
					}, function(error) {
						alert(error.toString());
					});
				}
			});
		});
	};

	/* Public */
	return {
		replyImoticons: function(container) {
			var textarea = container.parentNode.parentNode.querySelector('textarea');
			var replyPreview = textarea.parentNode.querySelector('.replyPreview');
			var markdownReplyPreview = Helper.debounce(function() {
				replyPreview.innerHTML = Helper.markdown2html(textarea.value);
			}, 400);

			textarea.addEventListener('keyup', markdownReplyPreview);

			var i, len = Config.replyImoticons.length;
			for (i = 0; i < len; i++) {
				var imoticon = Config.replyImoticons[i];
				var replyIB = _replyImoBtn(imoticon.code, imoticon.title, imoticon.src);

				replyIB.addEventListener('click', function() {
					var code = this.getAttribute('data-code');
					var src = this.getAttribute('data-src');
					if (textarea.value != '') textarea.value += '\n';
					textarea.value += src;
					replyPreview.innerHTML = Helper.markdown2html(textarea.value);
				});
				container.appendChild(replyIB);
			}
		},
		//Render.highlight(container, currentPostKey);
		highlight: function(_container, _currentPostKey) {
			var rows = _container.childNodes;
			var i, len = rows.length;
			for (i = 0; i < len; i++) {
				var row = rows[i];
				var key = row.querySelector('.pTitle a').getAttribute('data-key');
				if (_currentPostKey === key) {
					row.classList.add('highlighted');
				} else {
					row.classList.remove('highlighted');
				}
			}
		},
		ann: function(p) {
			var temp = _div('temp', '');
			var link = Render.createLink(p.title, '#' + p.category + '/@' + p.author + '/' + p.permlink);
			var date = new Date(p.created);
			var payout = Helper.getPayout(p);
			var isDeclined = Helper.isDeclinePayout(p);
			var isSteemGazua = Helper.isSteemGazua(p);
			var key = p.author + '_' + p.permlink;
			var row = _createRow(key, link, p.children, p.author, payout, p.net_votes, date, isDeclined, isSteemGazua);
			temp.appendChild(row);
			return temp.childNodes;
		},
		posts: function(tag, limit, callback) {
			var temp = _div('temp', '');
			var loader = document.querySelector('.loaderSpace');
			var more = document.querySelector('.steemContainer .more');

			var params = {
				"tag": tag,
				"limit": limit
			};
			if (_lastPost.permlink !== '') {
				params.start_permlink = _lastPost.permlink;
				params.start_author = _lastPost.author;
			}
			loader.style.display = 'block';
			more.style.display = 'none';
			steem.api.getDiscussionsByCreated(params, function(err, result) {
				if (err === null) {
					var i, len = result.length;
					for (i = 0; i < len; i++) {
						var p = result[i];

						// Skip Redundant, which is caused by "Load More" logic
						if (p.permlink == _lastPost.permlink && p.author == _lastPost.author) {
							continue;
						}

						// Skip Blacklisted Account
						if (Config.blackAccounts.indexOf(p.author) !== -1) {
							if (i == len - 1) {
								_lastPost.permlink = p.permlink;
								_lastPost.author = p.author;
							}
							continue;
						}

						var link = Render.createLink(p.title, '#' + p.category + '/@' + p.author + '/' + p.permlink);
						var date = new Date(p.created);
						var payout = Helper.getPayout(p);
						var isDeclined = Helper.isDeclinePayout(p);
						var key = p.author + '_' + p.permlink;
						var isSteemGazua = Helper.isSteemGazua(p);
						var row = _createRow(key, link, p.children, p.author, payout, p.active_votes.length, date, isDeclined, isSteemGazua);

						if (currentPostKey === key) {
							row.classList.add('highlighted');
						}

						temp.appendChild(row);

						if (i == len - 1) {
							_lastPost.permlink = p.permlink;
							_lastPost.author = p.author;
						}
						var v = Helper.countVotes(p.active_votes);
						posts[key] = {
							title: p.title,
							author: p.author,
							created: p.created,
							body: p.body,
							upvotes: v.up,
							downvotes: v.down,
							payout: p.pending_payout_value,
							decline: isDeclined,
							tags: JSON.parse(p.json_metadata).tags
						};
					}
					loader.style.display = 'none';
					more.style.display = 'block';
					more.disabled = false;
					callback({err: null, el: temp.childNodes});
				} else {
					console.log('ERROR:', err);
					callback({err: err, el: null});
				}
			});
		},
		post: function(container, hash, callback) {
			var args = hash.split('/', 3);
			//console.log('ARGS:', args);
			var category = args[0].replace('#', '');
			var author = args[1].replace('@', '');
			var permlink = args[2];

			steem.api.getContent(author, permlink, function(err, result) {
				console.log(err, result);
				if (err === null) {
					var v = Helper.countVotes(result.active_votes);
					var tags = JSON.parse(result.json_metadata).tags;
					var isDeclined = Helper.isDeclinePayout(result);
					var payout = Helper.getPayout(result);
					currentPostKey = author + '_' + permlink;
					console.log('Render.post:', currentPostKey);
					showPostDetails(container, result.body, result.title, result.author, permlink, result.created, v.up, v.down, payout, isDeclined, tags);
					callback();
				} else {
					console.error('some error', err);
				}
			});
			Render.replies(author, permlink, 0, function(result) {
				if (result.err === null) {
					var replyContainer = document.querySelector('.postDetails .replyContainer');
					replyContainer.appendChild(result.el);
				}
			});
		},
		replies: function(parentAuthor, parentPermlink, parentDepth, callback) {
			_replies(parentAuthor, parentPermlink, parentDepth, function(result) {
				callback(result);
			});
		},
		tags: function(tagsArray) {
			var postTags = _div('postTags', '');
			var uniqueChecker = [];
			var i, len = tagsArray.length;
			for (i = 0; i < len; i++) {
				if (uniqueChecker.indexOf(tagsArray[i]) === -1) {
					uniqueChecker.push(tagsArray[i]);
					var postTag = _div('postTag', tagsArray[i]);
					postTags.appendChild(postTag);
				}
			}
			return postTags;
		},
		votePercentOption: function(percent) {
			var option = _li('');
			var vote = _div('voteBtn', percent + '%');
			vote.setAttribute('data-percent', percent);
			var clear = _div('voteBtnClear', 'x');
			option.appendChild(vote);
			option.appendChild(clear);
			return option;
		},
		reset: function() {
			_lastPost.permlink = '';
			_lastPost.author = '';
		},
		isRefreshed: function() {
			return _lastPost.permlink == '';
		},
		createLink: function(title, url) {
			var el = document.createElement('a');
			el.textContent = title;
			el.href = url;
			return el;
		},
		img: function(src) {
			return _img(src);
		}
	};
})();
