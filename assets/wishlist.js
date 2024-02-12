document.addEventListener('DOMContentLoaded', function () {
  
function fetchDataFromUrls(urls) {
  var containerDiv = document.createElement('div');
  containerDiv.classList.add('wishlist_main_con','grid','product-grid','grid--2-col-tablet-down','grid--4-col-desktop');
  Promise.all(urls.map(url => {
  var add_class_to_wishlist = document.querySelector(`.add_to_wishlist[data_source="${url}"]`);
  if (add_class_to_wishlist) {
    console.log(add_class_to_wishlist);
    add_class_to_wishlist.classList.add('wishlist_added');
  }
  return fetch(url).then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.text();
    }).then(data => {
      var parser = new DOMParser();
      var doc = parser.parseFromString(data, "text/html");
      var card_product = doc.querySelector('.card__product');
      var product_image_media = card_product.querySelector('.card__media');
      var product_image = product_image_media.querySelector('img').getAttribute('src');
      var create_image = `<img src="${product_image}" />`
      product_image_media.innerHTML = create_image;
      card_product.classList.add('grid__item');
      card_product.classList.remove('hidden');
      if (card_product) {
        containerDiv.appendChild(card_product);
      }
    }).catch(error => console.error('Error fetching data from', url, ':', error));
    })
  ).then(() => {
    document.querySelector('.wishlist__section_main').appendChild(containerDiv);
  });
}
  var productUrls = getDataFromLocalStorage();
  fetchDataFromUrls(productUrls);  
  
function getDataFromLocalStorage() {
  var data = localStorage.getItem('setwishListitem');
  return data ? JSON.parse(data) : [];
}
function setWishlistItem(data, clickedElement) {
  var existingData = getWishlistFromLocal();
  var dataIndex = existingData.indexOf(data);
  if (dataIndex !== -1) {
    existingData.splice(dataIndex, 1);
  } else {
    existingData.push(data);
  }
  if (existingData.length >= 1) {
     document.querySelector('.header__wishlist .header_wishlist_seconry_icon').style.display = 'block';
     document.querySelector('.header__wishlist .wishlis_icon').style.display = 'none'; 
   }else{
     document.querySelector('.header__wishlist .header_wishlist_seconry_icon').style.display = 'none';
     document.querySelector('.header__wishlist .wishlis_icon').style.display = 'block'; 
   }
  localStorage.setItem('setwishListitem', JSON.stringify(existingData));
  const parentMain = parents(clickedElement, "card__product");
  parentMain.style.animation = 'slideUp 0.5s ease';
  setTimeout(() => {
    parentMain.remove();
  }, 400);
  
  
} 
  function handleWindowClick(event) {
  if (event.target.classList.contains('wishlist___added')) {
    var clickedElement = event.target;
    var data_source = clickedElement.getAttribute('data_source');
    setWishlistItem(data_source, clickedElement);
  }
}
  window.addEventListener('click', handleWindowClick);
  function getWishlistFromLocal() {
    var data = localStorage.getItem('setwishListitem');
    return data ? JSON.parse(data) : [];
  }
  function parents(element, parentClass) {
  let currentElement = element;
  while (currentElement) {
    if (currentElement.classList.contains(parentClass)) {
      return currentElement;
    }
    currentElement = currentElement.parentNode;
  }
}
});
