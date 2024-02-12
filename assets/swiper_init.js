var swiper = new Swiper(".mySwiper", {
  centeredSlides: true,
  centeredSlidesBounds: true,
  direction: "vertical",
  spaceBetween: 15,
  slidesPerView: 7,
   observer: true,
            observeParents: true,
  freeMode: false,
  draggable: true,
  clickable: true,
  navigation: {
    nextEl: ".swiper-button-next",
    prevEl: ".swiper-button-prev",
  },
});


var swiper2 = new Swiper(".mySwiper2", {
  draggable: true,
  observer: true,
            observeParents: true,
  clickable: true,
  spaceBetween: 10,
   autoHeight: true,
  slidesPerView: 1.5, // Display 1.5 slides
  breakpoints: {
    1200: {
      slidesPerView: 1, // Display 1 slide when screen width is below 120px
    },
  },
  thumbs: {
    swiper: swiper,
  },
  navigation: {
    nextEl: ".swiper-button-next",
    prevEl: ".swiper-button-prev",
  },
});


// var swiper2 = new Swiper(".mySwiper2", {
//   draggable: true,
//   clickable: true,
//   spaceBetween: 10,
//   thumbs: {
//     swiper: swiper,
//   },
//    navigation: {
//     nextEl: ".swiper-button-next",
//     prevEl: ".swiper-button-prev",
//   },
// });

// if (window.innerWidth <= 1200) {
//   var swiper2 = new Swiper(".mySwiper2", {
//     slidesPerView: 1.5, // Show 1.5 slides
//     spaceBetween: 10,
//     draggable: true,
//      clickable: true,
//      freeMode: false,
//   });
// }
 