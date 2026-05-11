async function analyze() {
  const username = document.getElementById('username-input').value.trim();
  const errorMsg = document.getElementById('error-msg');
  const results = document.getElementById('results');

  if (!username) return;

  errorMsg.style.display = 'none';
  results.style.display = 'none';
  document.getElementById('analyze-btn').textContent = 'Loading...';
  document.getElementById('loading').style.display = 'flex';

  try {
    const [profileRes, reposRes, eventsRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`),
      fetch(`https://api.github.com/users/${username}/repos?per_page=100`),
      fetch(`https://api.github.com/users/${username}/events?per_page=100`)
    ]);

    if (!profileRes.ok) throw new Error('User not found');

    const profile = await profileRes.json();
    const repos = await reposRes.json();
    const events = await eventsRes.json();

    const languages = getLanguages(repos);
    const dayActivity = getDayActivity(events);
    const hourActivity = getHourActivity(events);
    const insights = getInsights(profile, repos, events, languages);
    const roasts = getRoast(profile, repos, events, languages);
    const topRepos = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 3);
    const personality = getPersonality(profile, repos, events, languages);

    results.innerHTML = buildHTML(profile, languages, dayActivity, hourActivity, insights, roasts, topRepos, personality);
    results.style.display = 'block';
    document.getElementById('loading').style.display = 'none';

  } catch (err) {
    errorMsg.textContent = err.message === 'User not found'
      ? 'Username not found. Check the spelling and try again.'
      : 'Something went wrong. Try again.';
    errorMsg.style.display = 'block';
    document.getElementById('loading').style.display = 'none';
  } finally {
    document.getElementById('analyze-btn').textContent = 'Analyze';
  }
}

function getLanguages(repos) {
  const counts = {};
  repos.forEach(repo => {
    if (repo.language) {
      counts[repo.language] = (counts[repo.language] || 0) + 1;
    }
  });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lang, count]) => ({ lang, pct: Math.round((count / total) * 100) }));
}

function getDayActivity(events) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const counts = new Array(7).fill(0);
  events.forEach(e => {
    const day = new Date(e.created_at).getDay();
    counts[day]++;
  });
  const max = Math.max(...counts);
  return days.map((name, i) => ({ name, count: counts[i], active: counts[i] === max }));
}

function getHourActivity(events) {
  const counts = new Array(24).fill(0);
  events
    .filter(e => e.type === 'PushEvent')
    .forEach(e => {
      const hour = new Date(e.created_at).getUTCHours();
      counts[hour]++;
    });
  return counts;
}

function getPeakHourInsight(hourActivity) {
  const peak = hourActivity.indexOf(Math.max(...hourActivity));
  const label = peak === 0 ? 'midnight' : peak < 12 ? `${peak}am` : peak === 12 ? '12pm' : `${peak - 12}pm`;
  const zone = (peak >= 22 || peak <= 4) ? 'A true night owl 🦉'
    : (peak >= 5 && peak <= 9) ? 'An early bird 🐦'
    : (peak >= 10 && peak <= 17) ? 'A 9-to-5 coder 💼'
    : 'An evening coder 🌙';
  return 'Most commits around <strong>' + label + '</strong> — ' + zone;
}

function getInsights(profile, repos, events, languages) {
  const insights = [];

  const years = Math.floor((Date.now() - new Date(profile.created_at)) / (1000 * 60 * 60 * 24 * 365));
  insights.push('GitHub member for <span>' + years + ' year' + (years !== 1 ? 's' : '') + '</span>');

  if (languages.length > 0) {
    insights.push('Primary language is <span>' + languages[0].lang + '</span> — used in ' + languages[0].pct + '% of repos');
  }

  const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);
  insights.push('Earned <span>' + totalStars + ' total stars</span> across ' + repos.length + ' public repos');

  const topRepo = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count)[0];
  if (topRepo && topRepo.stargazers_count > 0) {
    insights.push('Most popular repo is <span>' + topRepo.name + '</span> with ' + topRepo.stargazers_count + ' stars');
  }

  const activeRepos = repos.filter(r => {
    const monthsAgo = (Date.now() - new Date(r.pushed_at)) / (1000 * 60 * 60 * 24 * 30);
    return monthsAgo < 3;
  }).length;
  if (activeRepos > 0) {
    insights.push('<span>' + activeRepos + ' repo' + (activeRepos !== 1 ? 's' : '') + '</span> updated in the last 3 months — actively coding');
  } else {
    insights.push('No repos updated in the last 3 months — <span>relatively quiet lately</span>');
  }

  const forked = repos.filter(r => r.fork).length;
  const original = repos.length - forked;
  const originalpct = Math.round((original / repos.length) * 100);
  insights.push('<span>' + originalpct + '% original repos</span> — ' + original + ' built from scratch, ' + forked + ' forked');

  const pushEvents = events.filter(e => e.type === 'PushEvent').length;
  const prEvents = events.filter(e => e.type === 'PullRequestEvent').length;
  const issueEvents = events.filter(e => e.type === 'IssuesEvent').length;
  if (prEvents > pushEvents) {
    insights.push('Strong <span>collaborator profile</span> — more PRs than direct pushes');
  } else if (issueEvents > 5) {
    insights.push('Active in <span>open source communities</span> — frequent issue activity');
  } else {
    insights.push('Mostly a <span>solo builder</span> — prefers pushing directly over PRs');
  }

  const avgStars = Math.round(totalStars / repos.length);
  if (avgStars >= 10) {
    insights.push('Averaging <span>' + avgStars + ' stars per repo</span> — above average reach');
  } else {
    insights.push('Averaging <span>' + avgStars + ' stars per repo</span> — mostly personal/utility projects');
  }

  if (events.length > 0) {
    const daysAgo = Math.floor((Date.now() - new Date(events[0].created_at)) / (1000 * 60 * 60 * 24));
    if (daysAgo === 0) insights.push('Last active <span>today</span>');
    else if (daysAgo === 1) insights.push('Last active <span>yesterday</span>');
    else insights.push('Last active <span>' + daysAgo + ' days ago</span>');
  }

  if (profile.followers > 0 && profile.following > 0) {
    const ratio = (profile.followers / profile.following).toFixed(1);
    if (ratio > 2) {
      insights.push('Follower ratio of <span>' + ratio + 'x</span> — more of an influencer than a follower');
    } else if (ratio < 0.5) {
      insights.push('Follows more than followed — <span>active networker</span>');
    } else {
      insights.push('Balanced follow ratio of <span>' + ratio + 'x</span>');
    }
  }

  return insights;
}

function getRoast(profile, repos, events, languages) {
  const roasts = [];

  const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);
  const forked = repos.filter(r => r.fork).length;
  const original = repos.length - forked;
  const pushEvents = events.filter(e => e.type === 'PushEvent').length;
  const prEvents = events.filter(e => e.type === 'PullRequestEvent').length;
  const years = Math.floor((Date.now() - new Date(profile.created_at)) / (1000 * 60 * 60 * 24 * 365));
  const activeRepos = repos.filter(r => {
    const monthsAgo = (Date.now() - new Date(r.pushed_at)) / (1000 * 60 * 60 * 24 * 30);
    return monthsAgo < 3;
  }).length;
  const lastActive = events.length > 0
    ? Math.floor((Date.now() - new Date(events[0].created_at)) / (1000 * 60 * 60 * 24))
    : 999;

  if (years >= 10) {
    roasts.push('A GitHub veteran who\'s been here so long they remember when the default branch was called <span>master</span> and nobody cared.');
  } else if (years >= 5) {
    roasts.push('Been on GitHub for <span>' + years + ' years</span> — long enough to know better, still writes TODO comments they\'ll never fix.');
  } else if (years <= 1) {
    roasts.push('Fresh off the boat — <span>' + (years === 0 ? 'less than a year' : '1 year') + '</span> on GitHub. Still Googling how to undo a git push.');
  } else {
    roasts.push('A solid <span>' + years + ' years</span> on GitHub. Not a legend, not a newbie — comfortably in the "I know enough to be dangerous" zone.');
  }

  if (languages.length > 0) {
    const lang = languages[0].lang;
    const langRoasts = {
      JavaScript: 'Primarily writes <span>JavaScript</span> — lives dangerously with undefined is not a function and loves it.',
      TypeScript: 'A <span>TypeScript</span> devotee — spends 40% of their time writing types so the other 60% can feel safe.',
      Python: 'A <span>Python</span> person — probably has 3 unfinished machine learning projects and a folder called "scripts" with 47 files.',
      Java: 'Mostly <span>Java</span> — still waiting for their enterprise Spring Boot app to finish starting up.',
      'C++': 'Writes <span>C++</span> — manages their own memory and their own suffering.',
      Rust: 'A <span>Rust</span> enjoyer — won\'t stop telling you about the borrow checker at parties.',
      Go: 'Writes <span>Go</span> — values simplicity and has strong opinions about error handling.',
      PHP: 'Still writing <span>PHP</span> — a survivor. Respect.',
      Ruby: 'A <span>Ruby</span> developer — deeply in love with Rails, slightly offended it\'s not 2012 anymore.',
      Swift: 'An <span>iOS/Swift</span> dev — spends half their life waiting for Xcode to index.',
      Kotlin: 'Writing <span>Kotlin</span> — escaped Java and never looked back.',
      HTML: 'Mostly <span>HTML</span> files on GitHub — bold choice to call that a programming language.',
    };
    roasts.push(langRoasts[lang] || 'Primary language is <span>' + lang + '</span> — a person of culture and questionable taste.');
  }

  if (lastActive > 180) {
    roasts.push('Last active <span>' + lastActive + ' days ago</span> — either on a deep focus streak or completely forgot this account exists.');
  } else if (lastActive > 30) {
    roasts.push('Hasn\'t pushed in over a month — probably "between projects" aka watching Netflix.');
  } else if (activeRepos >= 5) {
    roasts.push('<span>' + activeRepos + ' active repos</span> updated recently — either extremely productive or has a serious problem finishing things.');
  } else {
    roasts.push('Reasonably active — not grinding 24/7, not ghosting GitHub. A healthy relationship with code.');
  }

  if (totalStars > 10000) {
    roasts.push('Over <span>' + totalStars.toLocaleString() + ' stars</span> — basically GitHub famous. Has definitely been on a trending page.');
  } else if (totalStars > 1000) {
    roasts.push('A respectable <span>' + totalStars.toLocaleString() + ' stars</span> — known in certain corners of the internet.');
  } else if (totalStars === 0) {
    roasts.push('<span>Zero stars</span> across all repos. Coding in silence. Either humble or just getting started — we respect both.');
  } else {
    roasts.push('<span>' + totalStars + ' stars</span> total — mom and a few coworkers have definitely starred some of these.');
  }

  if (forked > original * 2) {
    roasts.push('More forks than original repos — a dedicated <span>collector of other people\'s code</span>. "I\'ll contribute eventually."');
  } else if (original > forked * 3) {
    roasts.push('Almost all original repos — either very creative or hasn\'t discovered that most problems are <span>already solved</span>.');
  }

  if (prEvents > pushEvents) {
    roasts.push('More PRs than pushes — a true <span>team player</span>. Writes detailed PR descriptions nobody reads.');
  } else if (pushEvents > 20 && prEvents === 0) {
    roasts.push('Pushes directly, never opens PRs — either works alone or is the <span>most confident person</span> in any codebase.');
  }

  return roasts;
}

function getPersonality(profile, repos, events, languages) {
  const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);
  const forked = repos.filter(r => r.fork).length;
  const original = repos.length - forked;
  const pushEvents = events.filter(e => e.type === 'PushEvent').length;
  const prEvents = events.filter(e => e.type === 'PullRequestEvent').length;
  const activeRepos = repos.filter(r => {
    const monthsAgo = (Date.now() - new Date(r.pushed_at)) / (1000 * 60 * 60 * 24 * 30);
    return monthsAgo < 3;
  }).length;

  const hours = events
    .filter(e => e.type === 'PushEvent')
    .map(e => new Date(e.created_at).getUTCHours());
  const nightCommits = hours.filter(h => h >= 22 || h <= 4).length;
  const isNightOwl = nightCommits > hours.length * 0.4;

  if (isNightOwl) return { label: 'The Night Owl', emoji: '🦉', desc: 'Comes alive after midnight. Probably has 12 tabs open.' };
  if (totalStars > 5000) return { label: 'The Open Source Hero', emoji: '🦸', desc: 'Their code runs on someone else\'s machine right now.' };
  if (prEvents > pushEvents) return { label: 'The Team Player', emoji: '🤝', desc: 'Never merges without a review. Writes detailed PR descriptions nobody reads.' };
  if (repos.length > 50 && activeRepos < 3) return { label: 'The Serial Starter', emoji: '🚀', desc: 'Legendary at starting projects. Less legendary at finishing them.' };
  if (original > forked * 4 && totalStars > 100) return { label: 'The Perfectionist', emoji: '💎', desc: 'Every repo has a beautiful README. Every function has a comment.' };
  if (forked > original * 2) return { label: 'The Collector', emoji: '📦', desc: 'Forks everything. "I\'ll contribute to this someday."' };
  if (activeRepos >= 5) return { label: 'The Grinder', emoji: '⚡', desc: 'Always shipping. Sleep is optional. Coffee is not.' };
  return { label: 'The Steady Builder', emoji: '🧱', desc: 'Consistent, reliable, no drama. The backbone of every good team.' };
}

function buildHTML(profile, languages, dayActivity, hourActivity, insights, roasts, topRepos, personality) {
  const hoursHTML = hourActivity.map(function(count, hour) {
    const max = Math.max.apply(null, hourActivity);
    const height = max > 0 ? Math.round((count / max) * 48) : 2;
    const isPeak = count === max;
    const label = hour === 0 ? '12a' : hour < 12 ? hour + 'a' : hour === 12 ? '12p' : (hour - 12) + 'p';
    return '<div class="hour-col ' + (isPeak ? 'peak' : '') + '">'
      + '<div class="hour-bar" style="height:' + Math.max(height, 2) + 'px"></div>'
      + '<div class="hour-label">' + (hour % 3 === 0 ? label : '') + '</div>'
      + '</div>';
  }).join('');

  return ''
    + '<div class="profile-header">'
    + '<img src="' + profile.avatar_url + '" alt="' + profile.login + '" />'
    + '<div>'
    + '<div class="profile-name">' + (profile.name || profile.login) + '</div>'
    + '<div class="profile-bio">' + (profile.bio || 'No bio provided') + '</div>'
    + '</div></div>'

    + '<div class="personality-badge">'
    + '<span class="personality-emoji">' + personality.emoji + '</span>'
    + '<div>'
    + '<div class="personality-label">' + personality.label + '</div>'
    + '<div class="personality-desc">' + personality.desc + '</div>'
    + '</div></div>'

    + '<div class="section-card" style="margin-bottom:8px">'
    + '<div class="section-title">🔍 Profile roast</div>'
    + roasts.map(function(r) { return '<div class="insight">' + r + '</div>'; }).join('')
    + '</div>'

    + '<div class="stats-grid">'
    + '<div class="stat-card"><div class="stat-value">' + profile.public_repos + '</div><div class="stat-label">Public repos</div></div>'
    + '<div class="stat-card"><div class="stat-value">' + profile.followers + '</div><div class="stat-label">Followers</div></div>'
    + '<div class="stat-card"><div class="stat-value">' + profile.following + '</div><div class="stat-label">Following</div></div>'
    + '</div>'

    + '<div class="section-card">'
    + '<div class="section-title">🌟 Most popular repos</div>'
    + topRepos.map(function(repo) {
        return '<div class="repo-row">'
          + '<a class="repo-name" href="' + repo.html_url + '" target="_blank">' + repo.name + '</a>'
          + '<div class="repo-desc">' + (repo.description || 'No description') + '</div>'
          + '<div class="repo-meta">'
          + (repo.language ? '<span class="repo-lang">' + repo.language + '</span>' : '')
          + '<span class="repo-stat">★ ' + repo.stargazers_count + '</span>'
          + '<span class="repo-stat">⑂ ' + repo.forks_count + '</span>'
          + '</div></div>';
      }).join('')
    + '</div>'

    + '<div class="section-card">'
    + '<div class="section-title">Top languages</div>'
    + languages.map(function(l) {
        return '<div class="lang-bar">'
          + '<div class="lang-name">' + l.lang + '</div>'
          + '<div class="lang-track"><div class="lang-fill" style="width:' + l.pct + '%"></div></div>'
          + '<div class="lang-pct">' + l.pct + '%</div>'
          + '</div>';
      }).join('')
    + '</div>'

    + '<div class="section-card">'
    + '<div class="section-title">Most active day</div>'
    + '<div class="day-grid">'
    + dayActivity.map(function(d) {
        return '<div class="day-cell ' + (d.active ? 'active' : '') + '">'
          + '<div>' + d.name + '</div>'
          + '<div class="day-count">' + d.count + '</div>'
          + '</div>';
      }).join('')
    + '</div></div>'

    + '<div class="section-card">'
    + '<div class="section-title">⏰ Most active hour</div>'
    + '<div class="hour-chart">' + hoursHTML + '</div>'
    + '<div class="hour-insight">' + getPeakHourInsight(hourActivity) + '</div>'
    + '</div>'

    + '<div class="section-card">'
    + '<div class="section-title">Insights</div>'
    + insights.map(function(i) { return '<div class="insight">' + i + '</div>'; }).join('')
    + '</div>';
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('username-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') analyze();
  });
});