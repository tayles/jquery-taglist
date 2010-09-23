var keyCode = {
	BACKSPACE: 8,
	COMMA: 188,
	DELETE: 46,
	DOWN: 40,
	END: 35,
	ENTER: 13,
	ESCAPE: 27,
	HOME: 36,
	INSERT: 45,
	LEFT: 37,
	NUMPAD_ENTER: 108,
	PAGE_DOWN: 34,
	PAGE_UP: 33,
	RIGHT: 39,
	SPACE: 32,
	TAB: 9,
	UP: 38
};


var autoSelectTopItemOnEnter = true;


var cache = {};

var txt, box;
var prevStr;
var searchWord;
var selectedTag = -1;

var suggestedTagsCache = {};

$(function() {

	txt = $('#txt');
	box = $('#box');
	
	jQuery.extend(jQuery.expr[':'], {
	  focus: function(e) {
        try{ return e == document.activeElement; }
			catch(err) { return false; }
		}
	});

	
	makeSuggestedTagsCache();
	
	// synchronise the suggested tags with what's in the tag list
	var tags = getTags();
	updateSuggestedTags(tags);
	
	$('a', '#suggestedTags').live('click keyup', function(e) {
		if( e.type == 'keyup' ) {
			var code = getKeycode(e);
			// only allow ENTER or SPACE to trigger
			if( code != keyCode.SPACE ) return;
		}
		toggleTag($(this).text());
		return false;
	});
	
	$('a', box).live('click', function() {
		selectTag($(this).text(), selectedTag);
		return false;
	}).live('keydown', function(e) {
		code = getKeycode(e);
		
		switch(code) {
			case keyCode.UP:
				navigateSuggestions('prev');
				break;
			case keyCode.DOWN:
				navigateSuggestions('next');
				break;
			case keyCode.PAGE_DOWN:
			case keyCode.END:
				navigateSuggestions('bottom');
				break;
			case keyCode.PAGE_UP:
			case keyCode.HOME:
				navigateSuggestions('top');
				break;
			case keyCode.ENTER:
				// noop (handled by click handler)
				break;
			default:
				console.log("code: ", code);
				closeBox(true);
				txt.text(txt.text() + code);
				break;
		}
	});
	
	box.css('top', txt.position().top + txt.outerHeight());

	// keydown keypress mouseup mousedown
	txt.bind('blur', function(e) {
		// clear box (if box isn't focused)
		if( box.is(':visible') ) {
			//setTimeout("closeBox()", 100);
		}
	});

	txt.bind('keyup focus', function(e) {

		var code = getKeycode(e);
		
		if( box.is(':visible') ) {
			switch(code) {
				case keyCode.UP:
				case keyCode.PAGE_DOWN:
				case keyCode.END:
					navigateSuggestions('bottom');
					break;
				case keyCode.DOWN:
				case keyCode.PAGE_UP:
				case keyCode.HOME:
					navigateSuggestions('top');
					break;
				case keyCode.ESCAPE:
				case keyCode.TAB:
					closeBox();
					break;
				case keyCode.ENTER:
					if( autoSelectTopItemOnEnter ) {
						// simulate a click event on the top item
						$('a', box).first().click();
					}
					break;					
			}
		}

		var str = txt.val();
		
		if( str == prevStr ) {
			return;
			//if( !e.type == 'keyup' || code != keyCode.DOWN ) return;
		}
		
		/*
		if( code == keyCode.DOWN && box.is(':visible')) ) {
			console.log("xx", str == prevStr, box.is(':visible') )
			return;
		}
*/

		// don't care if nothing has been changed
		//if( str == prevStr && ( code != keyCode.DOWN || !box.is(':visible') ) ) return;


		var tags;
		selectedTag = -1;
		searchWord = '';
		var boxPos = 0;
		tags = getTags();
		if( tags.length > 0 ) {
			var caretPos = txt[0].selectionEnd;

			var pos = 0;

			for( var idx = 0; idx < tags.length; idx++ ) {
				var tag = tags[idx];
				if( tag.length > 0 ) {
					if(caretPos <= pos + tag.length ) {
						selectedTag = idx;
						break;
					}
				}
				pos += tag.length + 1;
			}
			
			var preceedingTxt = '';
			if( pos > 0 ) preceedingTxt = str.substring(0, pos);
			boxPos = $.textMetrics(txt, preceedingTxt).width;
			//console.log(preceedingTxt, pos);
		}

		//console.log( selectedTag, tags[selectedTag] );

		
		
		if( selectedTag >= 0 ) {

			searchWord = tags[selectedTag];
			
			boxPos = txt.position().left + boxPos + 3;
			if( box.position().left != boxPos ) {
				box.css('left', boxPos);
				closeBox();
			}
			
			if( cache[searchWord] ) {
				console.log('Rendering [', searchWord, '] from cache...');
				renderAutocompleter(cache[searchWord]);
			}
			else {
				filterCurrentDropdown(searchWord);
				console.log('Looking up data for [', searchWord, ']...');
				$.get('wordList.txt', {q: searchWord}, handleLookupResults);
			}

			
		}
		else {
			closeBox();
		}

		updateSuggestedTags(tags);
		
		prevStr = str;

	});


});

function getKeycode(e) {
	return (e.keyCode ? e.keyCode : e.which);
}

function navigateSuggestions(direction) {
	var focusedEl = $('a:focus', box);
	var el;
	switch(direction) {
		case 'prev':
			var prevLnk = focusedEl.parent().prev().find('a');
			if( prevLnk.length ) el = prevLnk;
			else { navigateSuggestions('bottom'); return; }
			break;
		case 'next':
			var nextLnk = focusedEl.parent().next().find('a');
			if( nextLnk.length ) el = nextLnk;
			else { navigateSuggestions('top'); return; }
			break;
		case 'top':
			el = $('a', box).first();
			break;
		case 'bottom':
			el = $('a', box).last();
			break;
	}
	if(el) el.focus();
}

function closeBox(focusTxt) {
	box.hide();
	if(focusTxt) txt.focus();
}

function filterCurrentDropdown(searchWord) {
	// knock off letters from the searchWord until we find a match in the cache. e.g. if we have "databas" in the cache but not "database" we can still show relevant results until the http request returns
	for( var i = 1; i < searchWord.length; i++ ) {
		var substr = searchWord.substring(0, searchWord.length - i);
		if( cache[substr] ) {
			console.log("Found cache result for [", substr, "] while filtering...");
			renderAutocompleter(cache[substr]);
			return;
		}
	}
	closeBox();
}

function selectTag(tag, pos) {
	var tags = getTags();
	if( pos >= 0 ) {
		console.log("Replacing fragment", tags[pos], "] with [", tag);
		tags[pos] = tag;
		selectedTag = -1;
	}
	else {
		if( tags.indexOf(tag) == -1 ) {
			// append
			tags.push(tag);
		}
		else {
			// already have this tag, select it?
		}
	}
	
	txt.val(tags.join(' ').replace('/\s+/g', ' ').trim() + ' ');
	closeBox(true);
}

function toggleTag(tag) {
	var tags = getTags();
	var idx = tags.indexOf(tag);
	if( idx == -1 ) {
		// append
		tags.push(tag);
	}
	else {
		//delete
		tags.splice(idx, 1);
	}
	
	txt.val(tags.join(' ').replace('/\s+/g', ' ').trim() + ' ');
	closeBox();
	updateSuggestedTags(tags);
}

function updateSuggestedTags(tags) {
	$('a', '#suggestedTags').each(function() {
		var lnk = $(this);
		lnk.toggleClass('selectedTag', tags.indexOf(lnk.text()) > -1);
	});
}

function getTags() {
	return txt.val().trim().split(' ');
}

function renderAutocompleter(newTags) {
	var html = '';
	var currentTags = getTags();
	for( var idx in newTags ) {
		var tag = newTags[idx];
		if( currentTags.indexOf(tag) == -1 && tag.substring(0, searchWord.length) == searchWord ) {
			html += '<li><a href="#">' + tag + '</a></li>';
		}
	}
	
	if( html ) {
		box.html(html).show();
	}
	else {
		closeBox();
	}
}


function handleLookupResults(data) {
	if( searchWord ) {
		var tags = data.split("\r\n");
		
		cache[searchWord] = tags;
		renderAutocompleter(tags);
	}
	else {
		closeBox(true);
	}
}

function makeSuggestedTagsCache() {
	$('#suggestedTags a').each(function() {
		suggestedTagsCache[$(this).text()] = this;
	});
}