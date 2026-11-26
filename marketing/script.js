const db = supabase.createClient(
  'https://pjipcgpyvsiicyyouxpt.supabase.co',
  'sb_publishable_o5NFZ6L-_fkpCjZ4wMkY1w_U51NEfaA'
);

const $ = id => document.getElementById(id);
const form = $('campaignForm');

let authorized = false;
let editing = null;
let busy = false;

function status(message, type = '') {
  $('status').textContent = message;
  $('status').className = type;
}

function localDate(value) {
  const date = new Date(value);

  return new Date(
    date.getTime() -
    date.getTimezoneOffset() * 60000
  ).toISOString().slice(0, 16);
}

function campaignState(campaign) {

  const now = Date.now();

  if (!campaign.active) {
    return 'Inactive';
  }

  if (
    campaign.ends_at &&
    new Date(campaign.ends_at).getTime() <= now
  ) {
    return 'Expired';
  }

  if (
    new Date(campaign.starts_at).getTime() > now
  ) {
    return 'Scheduled';
  }

  return 'Live';
}

function preview() {

  $('bannerPreview').textContent =
    form.elements.headline.value.trim() ||
    'YOUR PROMOTIONAL MESSAGE';

  $('bannerPreview').hidden =
    !form.elements.banner_enabled.checked;
}

form.addEventListener('input', preview);

function reset() {

  editing = null;

  form.reset();

  form.elements.starts_at.value =
    localDate(new Date());

  $('formTitle').textContent = 'Create Campaign';

  preview();
}

function setBusy(value) {

  busy = value;

  $('save').disabled = value;
  $('cancel').disabled = value;

  $('campaigns')
    .querySelectorAll('button')
    .forEach(button => {
      button.disabled = value;
    });
}

async function checkAdmin() {

  const {
    data: { user },
    error
  } = await db.auth.getUser();

  if (error || !user) {

    $('locked').hidden = false;

    status(
      'Please sign in through the administrator dashboard.',
      'error'
    );

    return;
  }

  const result = await db
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (result.error || !result.data) {

    $('locked').hidden = false;

    status(
      result.error?.message ||
      'Administrator access denied.',
      'error'
    );

    return;
  }

  authorized = true;

  $('locked').hidden = true;
  $('dashboard').hidden = false;

  reset();

  await loadCampaigns();

  status('Marketing Center connected.', 'success');
}

async function loadCampaigns() {

  if (!authorized) return;

  const { data, error } = await db
    .from('campaigns')
    .select('*')
    .order('id', { ascending: false });

  if (error) throw error;

  $('total').textContent = data.length;

  $('live').textContent = data.filter(
    c => campaignState(c) === 'Live'
  ).length;

  $('scheduled').textContent = data.filter(
    c => campaignState(c) === 'Scheduled'
  ).length;

  $('campaigns').replaceChildren();

  if (!data.length) {

    $('campaigns').textContent =
      'No campaigns created yet.';

    return;
  }

  for (const campaign of data) {

    const article = document.createElement('article');
    article.className = 'campaign';

    const title = document.createElement('h3');
    title.textContent = campaign.name;

    const state = document.createElement('p');
    const currentState = campaignState(campaign);

    state.className =
      'campaign-state ' + currentState.toLowerCase();

    state.textContent = currentState.toUpperCase();

    const headline = document.createElement('p');
    headline.textContent = campaign.headline;

    const discount = document.createElement('p');

    discount.textContent =
      campaign.promo_code +
      ' | ' +
      campaign.discount_percent +
      '% OFF';

    const dates = document.createElement('p');

    dates.textContent =
      'Starts: ' +
      new Date(campaign.starts_at).toLocaleString() +
      ' | Ends: ' +
      (
        campaign.ends_at
          ? new Date(campaign.ends_at).toLocaleString()
          : 'No expiration'
      );

    const banner = document.createElement('p');

    banner.textContent =
      'Banner: ' +
      (campaign.banner_enabled ? 'Enabled' : 'Disabled');

    const actions = document.createElement('div');
    actions.className = 'actions';

    const edit = document.createElement('button');
    edit.textContent = 'Edit';

    edit.onclick = () => {

      if (busy || !authorized) return;

      editing = campaign.id;

      for (const key of [
        'name',
        'headline',
        'promo_code',
        'discount_percent'
      ]) {

        form.elements[key].value = campaign[key];
      }

      form.elements.starts_at.value =
        localDate(campaign.starts_at);

      form.elements.ends_at.value =
        campaign.ends_at
          ? localDate(campaign.ends_at)
          : '';

      form.elements.active.checked =
        campaign.active;

      form.elements.banner_enabled.checked =
        campaign.banner_enabled;

      $('formTitle').textContent = 'Edit Campaign';

      preview();

      form.scrollIntoView({ behavior: 'smooth' });
    };

    const toggle = document.createElement('button');

    toggle.textContent =
      campaign.active ? 'Deactivate' : 'Activate';

    toggle.onclick = async () => {

      if (busy || !authorized) return;

      setBusy(true);

      try {

        const { error } = await db
          .from('campaigns')
          .update({ active: !campaign.active })
          .eq('id', campaign.id)
          .select('id')
          .single();

        if (error) throw error;

        if (editing === campaign.id) reset();

        await loadCampaigns();

        status('Campaign updated.', 'success');

      } catch (error) {

        status(error.message, 'error');

      } finally {

        setBusy(false);
      }
    };

    const remove = document.createElement('button');

    remove.textContent = 'Delete';

    remove.onclick = async () => {

      if (busy || !authorized) return;

      if (!confirm('Delete ' + campaign.name + '?')) {
        return;
      }

      setBusy(true);

      try {

        const { error } = await db
          .from('campaigns')
          .delete()
          .eq('id', campaign.id)
          .select('id')
          .single();

        if (error) throw error;

        if (editing === campaign.id) reset();

        await loadCampaigns();

        status('Campaign deleted.', 'success');

      } catch (error) {

        status(error.message, 'error');

      } finally {

        setBusy(false);
      }
    };

    actions.append(edit, toggle, remove);

    article.append(
      title,
      state,
      headline,
      discount,
      dates,
      banner,
      actions
    );

    $('campaigns').append(article);
  }
}

form.onsubmit = async event => {

  event.preventDefault();

  if (!authorized || busy) return;

  setBusy(true);

  try {

    const f = form.elements;

    const campaign = {

      name: f.name.value.trim(),

      headline: f.headline.value.trim(),

      promo_code:
        f.promo_code.value.trim().toUpperCase(),

      discount_percent:
        Number(f.discount_percent.value),

      starts_at:
        new Date(f.starts_at.value).toISOString(),

      ends_at:
        f.ends_at.value
          ? new Date(f.ends_at.value).toISOString()
          : null,

      banner_enabled:
        f.banner_enabled.checked,

      active:
        f.active.checked
    };

    if (!campaign.name || !campaign.headline) {

      throw new Error(
        'Campaign name and headline are required.'
      );
    }

    if (!/^[A-Z0-9_-]{1,40}$/.test(campaign.promo_code)) {

      throw new Error(
        'Use letters, numbers, hyphens or underscores in promo codes.'
      );
    }

    if (
      !Number.isFinite(campaign.discount_percent) ||
      campaign.discount_percent <= 0 ||
      campaign.discount_percent > 100
    ) {

      throw new Error(
        'Discount must be greater than 0 and no more than 100%.'
      );
    }

    if (
      campaign.ends_at &&
      new Date(campaign.ends_at) <=
      new Date(campaign.starts_at)
    ) {

      throw new Error(
        'Expiration must occur after the start date.'
      );
    }

    status('Saving campaign...');

    const query = editing === null

      ? db.from('campaigns').insert(campaign)

      : db.from('campaigns')
          .update(campaign)
          .eq('id', editing);

    const { error } = await query
      .select('id')
      .single();

    if (error) throw error;

    reset();

    await loadCampaigns();

    status('Campaign saved successfully.', 'success');

  } catch (error) {

    status(error.message, 'error');

  } finally {

    setBusy(false);
  }
};

$('cancel').onclick = () => {

  if (!busy) reset();
};

checkAdmin().catch(error => {

  status(error.message, 'error');
});
