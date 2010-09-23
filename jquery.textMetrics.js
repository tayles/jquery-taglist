(function($) {

 $.textMetrics = function(el, html) {

  var h = 0, w = 0;

  var div = document.createElement('div');
  document.body.appendChild(div);
  
  var el = $(el);
  var div = $(div);
  
  div.css({
   position: 'absolute',
   left: -1000,
   top: -1000,
   display: 'none',
   'white-space': 'pre',
  });

  div.html( html != null ? html : el.html() != null ? el.html() : el.val() );
  
  var styles = ['font-size','font-style', 'font-weight', 'font-family','line-height', 'text-transform', 'letter-spacing', 'padding-left', 'padding-top'];
  $(styles).each(function() {
   var s = this.toString();
   //console.log(s, el.css(s));
   div.css(s, el.css(s));
  });

  h = div.outerHeight();
  w = div.outerWidth();

  div.remove();

  var ret = {
   height: h,
   width: w
  };

  return ret;
 }

})(jQuery);
