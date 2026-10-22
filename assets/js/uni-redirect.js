/* Old university detail links (university.html?id=…) now open that
   university's popup on the directory page. */
(function () {
  var id = new URLSearchParams(location.search).get('id');
  location.replace('./universities.html' + (id ? '?open=' + encodeURIComponent(id) : ''));
})();
