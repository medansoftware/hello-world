import {
  userSignIn,
  userSignUp,
  userStorage,
  verifyToken,
} from '@/ts/live-engine';

$(async function () {
  // session check
  const token = await userStorage.getItem('token');
  if (!token) {
    if (!window.location.pathname.match(/(sign-(up|in)|about|contact)/)) {
      window.location.replace('/live-sign-in.html');
    }
  } else {
    // json web token verification
    verifyToken(token).then(
      () => {
        //
      },
      async () => {
        // invalid / expired token
        await userStorage.setItem('data', null);
        await userStorage.setItem('token', null);
        window.location.replace('/live-sign-in.html');
      },
    );
  }

  $('.sign-out').on('click', async (event) => {
    event.preventDefault();
    await userStorage.setItem('data', null);
    await userStorage.setItem('token', null);
    window.location.replace('/live-sign-in.html');
  });

  $('#sign-up').on('submit', (e) => {
    e.preventDefault();
    userSignUp(
      false,
      $('input[name="username"]').val(),
      $('input[name="password"]').val(),
      $('input[name="full_name"]').val(),
    ).then(
      (authenticated) => {
        userStorage.setItem('data', authenticated.user);
        userStorage.setItem('token', authenticated.token);
        window.location.replace('/index.html');
      },
      (error) => {
        console.log(error.response?.data);
        if (error.response?.data) {
          if (error.response.data.errorCode === 400) {
            if (error.response.data.errorMessage === 'ValidationError') {
              $('.login-box-msg')
                .text('Please fill the form')
                .addClass('text-danger');
            } else {
              $('.login-box-msg')
                .text(error.response.data.errorMessage)
                .addClass('text-danger');
            }
          }
        }
      },
    );
  });

  $('#sign-in').on('submit', (e) => {
    e.preventDefault();
    userSignIn(
      $('input[name="identity"]').val(),
      $('input[name="password"]').val(),
    ).then((authenticated) => {
      userStorage.setItem('data', authenticated.user);
      userStorage.setItem('token', authenticated.token);
      window.location.replace('/index.html');
    }, console.log);
  });
});
