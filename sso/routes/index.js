var path = require('path');
var express = require('express');
var router = express.Router();
//偷懒，将token数据写入文件
var fs = require('fs');

/* GET home page. */
router.get('/', function (req, res, next) {
  if (!req.query.from) {
    res.render('index', {
      title: '统一登录passport 在user中心直接登'
    });
    return;
  }
  var from = req.query.from;
  var token = null;
  var cookieObj = {};
  var token_path = path.resolve() + '/token_user.json';
  req.headers.cookie && req.headers.cookie.split(';').forEach(function (Cookie) {
    var parts = Cookie.split('=');
    cookieObj[parts[0].trim()] = (parts[1] || '').trim();
  });
  token = cookieObj.token;
  //如果url带有token，则表明已经在passport鉴权过
  if (token) {
    //存在token，则在内存中寻找之前与用户的映射关系
    //异步的
    fs.readFile(token_path, 'utf8', function (err, data) {
      if (err) throw err;
      if (!data) data = '{}';
      data = JSON.parse(data);
      //如果存在标志，则验证通过
      if (data[token]) {
        res.redirect('http://' + from + '?token=' + token);
        return;
      }
      //如果不存在便引导至登录页重新登录
      res.render('index', {
        title: '统一登录passport - 客户端有token 但服务器没'
      });
    });
  } else {
    res.render('index', {
      title: '统一登录passport - 客户端没有token'
    });
  }
});
/**
 * 登陆 submit
 */
router.post('/', function (req, res, next) {
  var from = req.query.from;

  var name = req.body.name;
  var pwd = req.body.password;
  var token = new Date().getTime() + '_';
  var cookieObj = {};
  var token_path = path.resolve() + '/token_user.json';
  //简单验证
  if (name === pwd) {
    req.flash('success', '登录成功');
    //passport生成用户凭证，并且生成令牌入cookie返回给子系统
    token = token + name;
    res.setHeader("Set-Cookie", ['token=' + token]);
    //持久化，将token与用户的映射写入文件
    fs.readFile(token_path, 'utf8', function (err, data) {
      if (err) throw err;
      if (!data) data = '{}';
      data = JSON.parse(data);
      //以token为key
      data[token] = name;
      //存回去
      fs.writeFile(token_path, JSON.stringify(data), function (err) {
        if (err) throw err;
        if (!from) res.send('登陆成功，原地跳吧');
        else res.redirect('http://' + from + '?token=' + token);
      });
    });
  } else {
    console.log('登录失败');
  }
});
/**
 * 进去 退出页面
 */
router.get('/logout', function (req, res, next) {
  if (!req.query.from || !req.query.user) {
    res.send('logout who?')
    return;
  }
  var user = req.query.user;
  var token_path = path.resolve() + '/token_user.json';
  //将token与用户的映射 移出 文件
  fs.readFile(token_path, 'utf8', function (err, data) {
    if (err) throw err;
    if (!data) data = '{}';
    dataObj = JSON.parse(data);
    // 找到name对应的key-val, delete
    for (let k in dataObj) {
      if (k.match(/(?<=\_).*$/g)[0] === user) {
        delete dataObj[k]
        break;
      }
    }
    //存回去
    fs.writeFile(token_path, JSON.stringify(dataObj), function (err) {
      if (err) throw err;
      res.send('退出成功')
      // res.redirect('http://' + req.query.from);
    });
  });

});
module.exports = router;