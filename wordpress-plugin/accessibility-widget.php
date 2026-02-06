<?php
/**
 * Plugin Name: Accessibility Widget
 * Plugin URI: https://github.com/kshah902/accessibility-widget-standalone
 * Description: Add a comprehensive accessibility widget to your WordPress site. Features include text size adjustment, high contrast mode, dyslexia font, color blindness filters, text-to-speech, and more.
 * Version: 1.0.5
 * Author: Krunal Shah
 * Author URI: https://github.com/kshah902
 * License: MIT
 * Text Domain: accessibility-widget
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('A11Y_WIDGET_VERSION', '1.0.5');
define('A11Y_WIDGET_CDN_BASE', 'https://cdn.jsdelivr.net/npm/@krunalshah/accessibility-widget-standalone@latest');
define('A11Y_WIDGET_GITHUB_REPO', 'kshah902/accessibility-widget-standalone');
define('A11Y_WIDGET_SLUG', plugin_basename(__FILE__));

/**
 * Enqueue the accessibility widget scripts and styles from CDN
 * Uses @latest so JS/CSS auto-updates when a new npm version is published
 */
function a11y_widget_enqueue_scripts() {
    $cdn_base = A11Y_WIDGET_CDN_BASE;

    wp_enqueue_style(
        'a11y-widget-css',
        $cdn_base . '/dist/accessibility.css',
        array(),
        A11Y_WIDGET_VERSION
    );

    wp_enqueue_script(
        'a11y-widget-js',
        $cdn_base . '/dist/standalone.global.js',
        array(),
        A11Y_WIDGET_VERSION,
        true
    );
}

add_action('wp_enqueue_scripts', 'a11y_widget_enqueue_scripts');

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
                'slug'        => 'accessibility-widget',
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
    if ($action !== 'plugin_information' || !isset($args->slug) || $args->slug !== 'accessibility-widget') {
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
        'name'          => 'Accessibility Widget',
        'slug'          => 'accessibility-widget',
        'version'       => ltrim($release->tag_name, 'v'),
        'author'        => '<a href="https://github.com/kshah902">Krunal Shah</a>',
        'homepage'      => 'https://github.com/' . A11Y_WIDGET_GITHUB_REPO,
        'requires'      => '5.0',
        'tested'        => '6.7',
        'requires_php'  => '7.4',
        'sections'      => array(
            'description' => 'A comprehensive accessibility widget for your WordPress site. Features include text size adjustment, high contrast mode, dyslexia-friendly font, color blindness filters, text-to-speech, keyboard shortcuts, and more.',
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
 * After plugin update, ensure the folder name stays as 'accessibility-widget'
 * GitHub release zips may extract with a different folder name
 */
function a11y_widget_after_update($upgrader_object, $options) {
    if (
        isset($options['action']) && $options['action'] === 'update' &&
        isset($options['type']) && $options['type'] === 'plugin' &&
        isset($options['plugins']) && is_array($options['plugins'])
    ) {
        foreach ($options['plugins'] as $plugin) {
            if ($plugin === A11Y_WIDGET_SLUG) {
                // Clear the update transient so WordPress re-checks
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
    $settings_link = '<a href="https://github.com/' . A11Y_WIDGET_GITHUB_REPO . '#readme" target="_blank">Documentation</a>';
    array_unshift($links, $settings_link);
    return $links;
}

add_filter('plugin_action_links_' . plugin_basename(__FILE__), 'a11y_widget_settings_link');
