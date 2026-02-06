<?php
/**
 * Plugin Name: Akby Accessibility Widget
 * Plugin URI: https://github.com/kshah902/accessibility-widget-standalone
 * Description: Add a comprehensive accessibility widget to your WordPress site. Features include text size adjustment, high contrast mode, dyslexia font, color blindness filters, text-to-speech, and more.
 * Version: 1.1.0
 * Author: Akby
 * Author URI: https://akby.com
 * License: Proprietary
 * Text Domain: akby-accessibility-widget
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('A11Y_WIDGET_VERSION', '1.1.0');
define('A11Y_WIDGET_CDN_BASE', 'https://cdn.jsdelivr.net/npm/@krunalshah/accessibility-widget-standalone@latest');
define('A11Y_WIDGET_GITHUB_REPO', 'kshah902/accessibility-widget-standalone');
define('A11Y_WIDGET_SLUG', plugin_basename(__FILE__));
define('A11Y_WIDGET_UNIQUE_SLUG', 'akby-accessibility-widget');

/**
 * Prevent WordPress from checking wordpress.org for updates to this plugin.
 * This stops WordPress from replacing our custom plugin with a similarly-named
 * plugin from the public repository.
 */
function a11y_widget_exclude_from_wporg($request, $url) {
    if (false === strpos($url, 'api.wordpress.org/plugins/update-check')) {
        return $request;
    }

    $plugins = json_decode($request['body']['plugins'], true);
    if (isset($plugins['plugins'][A11Y_WIDGET_SLUG])) {
        unset($plugins['plugins'][A11Y_WIDGET_SLUG]);
        $request['body']['plugins'] = json_encode($plugins);
    }

    return $request;
}

add_filter('http_request_args', 'a11y_widget_exclude_from_wporg', 10, 2);

// ============================================================
// Settings Page
// ============================================================

/**
 * Register settings
 */
function a11y_widget_register_settings() {
    register_setting('a11y_widget_settings', 'a11y_widget_license_key', array(
        'type'              => 'string',
        'sanitize_callback' => 'sanitize_text_field',
        'default'           => '',
    ));
}

add_action('admin_init', 'a11y_widget_register_settings');

/**
 * Add settings page under Settings menu
 */
function a11y_widget_admin_menu() {
    add_options_page(
        'Akby Accessibility Widget',
        'Akby Accessibility Widget',
        'manage_options',
        'akby-accessibility-widget',
        'a11y_widget_settings_page'
    );
}

add_action('admin_menu', 'a11y_widget_admin_menu');

/**
 * Render the settings page
 */
function a11y_widget_settings_page() {
    if (!current_user_can('manage_options')) {
        return;
    }
    ?>
    <div class="wrap">
        <h1>Akby Accessibility Widget Settings</h1>
        <form method="post" action="options.php">
            <?php settings_fields('a11y_widget_settings'); ?>
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row">
                        <label for="a11y_widget_license_key">License Key</label>
                    </th>
                    <td>
                        <input
                            type="text"
                            id="a11y_widget_license_key"
                            name="a11y_widget_license_key"
                            value="<?php echo esc_attr(get_option('a11y_widget_license_key', '')); ?>"
                            class="regular-text"
                            placeholder="AW-..."
                        />
                        <p class="description">
                            Enter the license key provided by Akby. The widget will only
                            appear on your site if a valid license key is entered.
                        </p>
                    </td>
                </tr>
            </table>
            <?php submit_button('Save Settings'); ?>
        </form>
    </div>
    <?php
}

// ============================================================
// Frontend Script Enqueue
// ============================================================

/**
 * Enqueue the accessibility widget scripts and styles from CDN.
 * Passes the license key via a data attribute on the script tag.
 */
function a11y_widget_enqueue_scripts() {
    $license_key = get_option('a11y_widget_license_key', '');

    // Don't enqueue if no license key is set
    if (empty($license_key)) {
        return;
    }

    $cdn_base = A11Y_WIDGET_CDN_BASE;

    wp_enqueue_style(
        'akby-a11y-widget-css',
        $cdn_base . '/dist/accessibility.css',
        array(),
        A11Y_WIDGET_VERSION
    );

    wp_enqueue_script(
        'akby-a11y-widget-js',
        $cdn_base . '/dist/standalone.global.js',
        array(),
        A11Y_WIDGET_VERSION,
        true
    );
}

add_action('wp_enqueue_scripts', 'a11y_widget_enqueue_scripts');

/**
 * Add data-license-key attribute to the widget script tag
 */
function a11y_widget_script_attributes($tag, $handle, $src) {
    if ($handle !== 'akby-a11y-widget-js') {
        return $tag;
    }

    $license_key = esc_attr(get_option('a11y_widget_license_key', ''));
    if (empty($license_key)) {
        return $tag;
    }

    // Add the data-license-key attribute to the script tag
    return str_replace(
        ' src=',
        ' data-license-key="' . $license_key . '" src=',
        $tag
    );
}

add_filter('script_loader_tag', 'a11y_widget_script_attributes', 10, 3);

// ============================================================
// Auto-Update from GitHub Releases
// ============================================================

/**
 * Check GitHub releases for plugin updates
 * WordPress calls this periodically (every 12 hours) to check for updates
 */
function a11y_widget_check_for_updates($transient) {
    if (empty($transient->checked)) {
        return $transient;
    }

    // Check GitHub for the latest release
    $response = wp_remote_get(
        'https://api.github.com/repos/' . A11Y_WIDGET_GITHUB_REPO . '/releases/latest',
        array(
            'headers' => array(
                'Accept' => 'application/vnd.github.v3+json',
            ),
            'timeout' => 10,
        )
    );

    if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
        return $transient;
    }

    $release = json_decode(wp_remote_retrieve_body($response));
    if (!$release || !isset($release->tag_name)) {
        return $transient;
    }

    $latest_version = ltrim($release->tag_name, 'v');

    // Compare versions - if GitHub has a newer version, add to update list
    if (version_compare(A11Y_WIDGET_VERSION, $latest_version, '<')) {
        // Find the zip asset in the release
        $zip_url = '';
        if (!empty($release->assets)) {
            foreach ($release->assets as $asset) {
                if (substr($asset->name, -4) === '.zip') {
                    $zip_url = $asset->browser_download_url;
                    break;
                }
            }
        }

        if ($zip_url) {
            $transient->response[A11Y_WIDGET_SLUG] = (object) array(
                'slug'        => A11Y_WIDGET_UNIQUE_SLUG,
                'plugin'      => A11Y_WIDGET_SLUG,
                'new_version' => $latest_version,
                'url'         => $release->html_url,
                'package'     => $zip_url,
            );
        }
    }

    return $transient;
}

add_filter('pre_set_site_transient_update_plugins', 'a11y_widget_check_for_updates');

/**
 * Provide plugin info for the "View Details" popup on the Plugins page
 */
function a11y_widget_plugin_info($result, $action, $args) {
    if ($action !== 'plugin_information' || !isset($args->slug) || $args->slug !== A11Y_WIDGET_UNIQUE_SLUG) {
        return $result;
    }

    $response = wp_remote_get(
        'https://api.github.com/repos/' . A11Y_WIDGET_GITHUB_REPO . '/releases/latest',
        array(
            'headers' => array(
                'Accept' => 'application/vnd.github.v3+json',
            ),
            'timeout' => 10,
        )
    );

    if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
        return $result;
    }

    $release = json_decode(wp_remote_retrieve_body($response));
    if (!$release) {
        return $result;
    }

    $plugin_info = (object) array(
        'name'          => 'Akby Accessibility Widget',
        'slug'          => A11Y_WIDGET_UNIQUE_SLUG,
        'version'       => ltrim($release->tag_name, 'v'),
        'author'        => '<a href="https://akby.com">Akby</a>',
        'homepage'      => 'https://github.com/' . A11Y_WIDGET_GITHUB_REPO,
        'requires'      => '5.0',
        'tested'        => '6.7',
        'requires_php'  => '7.4',
        'sections'      => array(
            'description' => 'A comprehensive accessibility widget for your WordPress site by Akby. Features include text size adjustment, high contrast mode, dyslexia-friendly font, color blindness filters, text-to-speech, keyboard shortcuts, and more.',
            'changelog'   => nl2br(esc_html($release->body ?? 'See GitHub for changelog.')),
        ),
    );

    // Find zip download URL
    if (!empty($release->assets)) {
        foreach ($release->assets as $asset) {
            if (substr($asset->name, -4) === '.zip') {
                $plugin_info->download_link = $asset->browser_download_url;
                break;
            }
        }
    }

    return $plugin_info;
}

add_filter('plugins_api', 'a11y_widget_plugin_info', 10, 3);

/**
 * After plugin update, clear transient so WordPress re-checks
 */
function a11y_widget_after_update($upgrader_object, $options) {
    if (
        isset($options['action']) && $options['action'] === 'update' &&
        isset($options['type']) && $options['type'] === 'plugin' &&
        isset($options['plugins']) && is_array($options['plugins'])
    ) {
        foreach ($options['plugins'] as $plugin) {
            if ($plugin === A11Y_WIDGET_SLUG) {
                delete_site_transient('update_plugins');
                break;
            }
        }
    }
}

add_action('upgrader_process_complete', 'a11y_widget_after_update', 10, 2);

/**
 * Add settings link on plugin page
 */
function a11y_widget_settings_link($links) {
    $settings_link = '<a href="' . admin_url('options-general.php?page=akby-accessibility-widget') . '">Settings</a>';
    array_unshift($links, $settings_link);
    return $links;
}

add_filter('plugin_action_links_' . plugin_basename(__FILE__), 'a11y_widget_settings_link');
