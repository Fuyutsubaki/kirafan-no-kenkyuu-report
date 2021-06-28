'use strict';
const http = require('http');
const pug = require('pug');


function strategy2(left_num, left_hit, left_cuk, left_re, base_ratio) {
  if(left_num > left_cuk){
    return false;
  }
  let expected = (Math.min(left_num-10, left_cuk) + left_re) * 2.5 * base_ratio 
  return expected <= (left_hit-1) * 1.2
}

// 1. キーホルダーを優先的に使う
// 2. キーホルダーは天井付近でのみ && {次回以降キーホルダーを使った場合の凸数の期待値} <= {のこり必要凸数} * 1.1 が成り立つ場合使う
function solve(require_hit_num, base_ratio, cuk_num, rk_num, strategy) {
  let num = 0;
  let hit = 0;
  let use_cuk_num = 0;
  let use_rk_num = 0;
  while (true) {
    let use_cuk = false;
    if (use_cuk_num + 10 <= cuk_num) {
      if (strategy == 1) {
        use_cuk = true
      } else if (strategy == 2) {
        use_cuk = strategy2(250 - num, require_hit_num - hit, cuk_num - use_cuk_num, rk_num - use_rk_num, base_ratio)
      }
    }

    let hit2 = 0;
    for (let i2 = 0; i2 < 10; ++i2) {
      const r = use_cuk ? base_ratio * 2.5 : base_ratio;
      if (Math.random() < r) {
        hit2 += 1;
      }
    }

    //retry
    if (use_cuk_num && use_rk_num + 10 <= rk_num && hit2 == 0) {
      use_rk_num += 10;
      continue;
    }
    // comsume
    num += 10;
    hit += hit2;
    if (use_cuk) {
      use_cuk_num += 10;
    }
    if(num >= 250){
       hit+=1;
      break; 
    }
    if (hit >= require_hit_num ) {
      break;
    }
  }
  return { use_cuk_num, use_rk_num, num, hit };
}

const server = http
  .createServer((req, res) => {
    const now = new Date();
    console.info('[' + now + '] Requested by ' + req.socket.remoteAddress);
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8'
    });

    if (req.url === '/index') {
      switch (req.method) {
        case 'GET':
            res.write(
              pug.renderFile('./form.pug', {
                path: req.url,
                results : []
              })
            );
          break;
        case 'POST':
            console.info('post');
            let rawData = '';
            req
              .on('data', chunk => {
                rawData = rawData + chunk;
              })
              .on('end', () => {
                const qs = require('querystring');
                const ret = qs.parse(rawData);
                let base_ratio = Number(ret["base_ratio"]) * 0.01;
                let cuk_num = Number(ret["cuk_num"]);
                let rk_num = Number(ret["rk_num"])
                let require_hit_num = Number(ret["require_hit_num"]);
                let strategy = Number(ret["strategy"]);
                console.log([require_hit_num, base_ratio,cuk_num,rk_num,strategy])
                let results = [];
                for(let i=0;i<10;++i)
                {
                  results.push(solve(require_hit_num, base_ratio,cuk_num,rk_num,strategy))
                }
                console.log(results)
                let content = pug.renderFile('./form.pug', {
                  path: req.url,
                  results: results
                });
                res.write(content);
              });
          
          break;
        default:
          break;
      }
    }
  })
  .on('error', e => {
    console.error('[' + new Date() + '] Server Error', e);
  })
  .on('clientError', e => {
    console.error('[' + new Date() + '] Client Error', e);
  });
const port = process.env.PORT || 8000;
server.listen(port, () => {
  console.info('[' + new Date() + '] Listening on ' + port);
});
